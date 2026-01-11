import { ITextReranker, RerankResult } from "../interfaces/reranker"
import { listOneOrMany, OneOrMany } from "../../common/types"
import { SectionUnit, SemanticUnit, TextualUnit } from "./units"
import { transformTextToUnits, transformUnitsToText } from "./transform"

/**
 * Filter options for hierarchical document pruning
 */
export interface FilterOptions {
   /**
    * Minimum absolute score threshold (0-1). Nodes below this are pruned.
    * Default: 0.0 (no absolute threshold)
    */
   minScore?: number

   /**
    * Relative threshold factor (0-1). Nodes with score < (topScore * relativeThreshold) are pruned.
    * Default: 0.3 (keep nodes scoring at least 30% of the top score)
    */
   relativeThreshold?: number

   /**
    * Maximum character budget for the output. Greedily selects highest-scoring nodes.
    * Default: undefined (no budget limit)
    */
   maxCharacters?: number

   /**
    * Maximum number of top-level units to keep after pruning.
    * Default: undefined (no limit)
    */
   maxUnits?: number

   /**
    * Invert the filter logic (negative filtering).
    * When true, REMOVES nodes that match the query well and KEEPS low-scoring nodes.
    * Useful for filtering out noise by querying for noise patterns.
    * Default: false
    */
   invert?: boolean
}

/**
 * Internal node used during hierarchical scoring and pruning
 */
interface ScoredNode {
   unit: SemanticUnit
   text: string           // Text representation for scoring
   score: number          // Relevance score from reranker
   children: ScoredNode[] // Child nodes (for sections)
   depth: number          // Tree depth
   charCount: number      // Character count of text representation
}

/**
 * Filters text content using hierarchical document pruning based on reranker scores.
 * 
 * This function transforms text into semantic units, scores them against the query,
 * and returns pruned text containing only the most relevant sections.
 * 
 * @param query - The query to score relevance against
 * @param content - The text content to filter
 * @param format - The format of the content (e.g., "md", "ts", "py")
 * @param reranker - The reranker to use for scoring
 * @param options - Pruning options
 * @returns Filtered text containing only relevant sections
 */
export async function filterText(
   query: string,
   content: string,
   format: string,
   reranker: ITextReranker,
   options?: FilterOptions
): Promise<string> {
   // Transform text to semantic units
   const units = await transformTextToUnits(content, format)

   // Filter the units
   const filtered = await filterUnits(query, units, reranker, options)

   // Transform back to text
   return transformUnitsToText(filtered)
}

/**
 * Filters semantic units using hierarchical document pruning based on reranker scores.
 * 
 * ## Algorithm: Hierarchical Score-Based Pruning with Propagation
 * 
 * 1. **Build Scored Tree**: Traverse the semantic unit tree, converting each node to a
 *    ScoredNode with its text representation.
 * 
 * 2. **Batch Score Leaf Nodes**: Collect all leaf node texts and score them against the
 *    query in a single batch reranker call (efficient).
 * 
 * 3. **Bottom-Up Score Propagation**: Propagate scores from leaves to parents using
 *    max-pooling (parent inherits maximum child score). This ensures parent sections
 *    are retained if ANY child is relevant.
 * 
 * 4. **Top-Down Hierarchical Pruning**: Apply thresholds at each level:
 *    - Absolute threshold: prune if score < minScore
 *    - Relative threshold: prune if score < (topScore * relativeThreshold)
 *    - Budget constraint: greedily select highest-scoring nodes within character limit
 * 
 * 5. **Reconstruct Units**: Build pruned semantic units from surviving nodes.
 * 
 * @param query - The query to score relevance against
 * @param units - The semantic units to filter
 * @param reranker - The reranker to use for scoring
 * @param options - Pruning options
 * @returns Filtered semantic units containing only relevant sections
 */
export async function filterUnits(
   query: string,
   units: OneOrMany<SemanticUnit>,
   reranker: ITextReranker,
   options?: FilterOptions
): Promise<OneOrMany<SemanticUnit>> {
   const opts: Required<FilterOptions> = {
      minScore: options?.minScore ?? 0.0,
      relativeThreshold: options?.relativeThreshold ?? 0.3,
      maxCharacters: options?.maxCharacters ?? Infinity,
      maxUnits: options?.maxUnits ?? Infinity,
      invert: options?.invert ?? false,
   }

   // Convert to array for uniform processing
   const unitList = [...listOneOrMany(units)]
   if (unitList.length === 0) return units

   // Step 1: Build scored tree structure
   const scoredNodes = unitList.map(u => buildScoredNode(u, 0))

   // Step 2: Collect all leaf texts for batch scoring
   const leafNodes: ScoredNode[] = []
   for (const node of scoredNodes) {
      collectLeafNodes(node, leafNodes)
   }

   // Step 3: Batch score all leaves with reranker
   if (leafNodes.length > 0) {
      const texts = leafNodes.map(n => n.text)
      const results = await reranker.rerank(query, texts)

      // Map results back to nodes
      const scoreMap = new Map<number, number>()
      for (const result of results) {
         scoreMap.set(result.index, result.score)
      }

      // Assign scores to leaf nodes
      for (let i = 0; i < leafNodes.length; i++) {
         leafNodes[i].score = scoreMap.get(i) ?? 0
      }
   }

   // Step 4: Bottom-up score propagation (max-pooling)
   for (const node of scoredNodes) {
      propagateScores(node)
   }

   // Step 5: Apply hierarchical pruning
   const prunedNodes = pruneNodes(scoredNodes, opts)

   // Step 6: Reconstruct semantic units from pruned nodes
   const result = prunedNodes.map(n => reconstructUnit(n))

   // Return in same format as input (single or array)
   if (!Array.isArray(units) && result.length === 1) {
      return result[0]
   }
   return result
}

/**
 * Builds a scored node tree from a semantic unit
 */
function buildScoredNode(unit: SemanticUnit, depth: number): ScoredNode {
   const text = transformUnitsToText(unit)
   const node: ScoredNode = {
      unit,
      text,
      score: 0,
      children: [],
      depth,
      charCount: text.length,
   }

   // Recursively process children for section units
   if (unit instanceof SectionUnit && unit.content) {
      node.children = unit.content.map(child => buildScoredNode(child, depth + 1))
   }

   return node
}

/**
 * Collects all leaf nodes (nodes without children or TextualUnits)
 */
function collectLeafNodes(node: ScoredNode, leaves: ScoredNode[]): void {
   if (node.children.length === 0) {
      // Leaf node - add to collection if it has meaningful text
      if (node.text.trim().length > 0) {
         leaves.push(node)
      }
   } else {
      // Non-leaf - recurse into children
      for (const child of node.children) {
         collectLeafNodes(child, leaves)
      }
   }
}

/**
 * Propagates scores from leaves to parents using max-pooling
 * Returns the node's final score
 */
function propagateScores(node: ScoredNode): number {
   if (node.children.length === 0) {
      // Leaf node - score is already set from reranker
      return node.score
   }

   // Non-leaf: propagate from children and use max-pooling
   const childScores = node.children.map(child => propagateScores(child))
   node.score = Math.max(...childScores, 0)

   return node.score
}

/**
 * Applies hierarchical pruning based on options
 */
function pruneNodes(nodes: ScoredNode[], opts: Required<FilterOptions>, isTopLevel: boolean = true): ScoredNode[] {
   if (nodes.length === 0) return []

   // Find the top score for relative threshold calculation
   const topScore = Math.max(...nodes.map(n => n.score))
   const effectiveThreshold = Math.max(
      opts.minScore,
      topScore * opts.relativeThreshold
   )

   let filtered: ScoredNode[]
   
   if (opts.invert) {
      // Negative filtering: REMOVE high-scoring nodes, KEEP low-scoring ones
      // For inverted mode, we process differently:
      // - At top level, we keep all nodes but recursively prune their children
      // - This allows us to remove specific matching subsections while keeping the structure
      
      if (isTopLevel) {
         // At top level in inverted mode, keep all nodes but prune their children
         filtered = nodes.map(node => {
            if (node.children.length > 0) {
               // Recursively prune children
               const prunedNode: ScoredNode = { ...node }
               prunedNode.children = pruneNodes(node.children, opts, false)
               // Recalculate char count after pruning children
               if (prunedNode.children.length > 0) {
                  prunedNode.charCount = prunedNode.children.reduce((sum, c) => sum + c.charCount, 0)
               }
               return prunedNode
            }
            // Leaf node at top level - apply threshold
            return node.score < effectiveThreshold ? node : null
         }).filter((n): n is ScoredNode => n !== null)
      } else {
         // At child levels, filter out high-scoring nodes (the noise)
         filtered = nodes.filter(n => n.score < effectiveThreshold)
         // Recursively prune children of surviving nodes
         filtered = filtered.map(node => {
            if (node.children.length > 0) {
               const prunedNode: ScoredNode = { ...node }
               prunedNode.children = pruneNodes(node.children, opts, false)
               return prunedNode
            }
            return node
         })
      }
      // Sort by score (ascending) - lowest scores first
      filtered.sort((a, b) => a.score - b.score)
   } else {
      // Normal filtering: KEEP high-scoring nodes
      filtered = nodes.filter(n => n.score >= effectiveThreshold)
      // Sort by score (descending) for budget-aware selection
      filtered.sort((a, b) => b.score - a.score)
      
      // Recursively prune children of surviving nodes (not in budget mode)
      if (opts.maxCharacters === Infinity) {
         for (const node of filtered) {
            if (node.children.length > 0) {
               node.children = pruneNodes(node.children, opts, false)
            }
         }
      }
   }

   // Apply maxUnits limit
   if (opts.maxUnits < Infinity) {
      filtered = filtered.slice(0, opts.maxUnits)
   }

   // Apply character budget with drill-down for oversized nodes (only in normal mode)
   if (opts.maxCharacters < Infinity && !opts.invert) {
      const selected: ScoredNode[] = []
      let charCount = 0

      for (const node of filtered) {
         if (charCount + node.charCount <= opts.maxCharacters) {
            // Node fits in budget
            selected.push(node)
            charCount += node.charCount
         } else if (node.children.length > 0) {
            // Node too large - try to fit children instead
            const remainingBudget = opts.maxCharacters - charCount
            const childOpts = { ...opts, maxCharacters: remainingBudget }
            const prunedChildren = pruneNodes(node.children, childOpts, false)
            
            if (prunedChildren.length > 0) {
               // Create a node with only the children that fit
               const partialNode: ScoredNode = {
                  ...node,
                  children: prunedChildren,
                  charCount: prunedChildren.reduce((sum, c) => sum + c.charCount, 0)
               }
               selected.push(partialNode)
               charCount += partialNode.charCount
            }
         }
      }
      filtered = selected
   }

   return filtered
}

/**
 * Reconstructs a semantic unit from a scored node
 */
function reconstructUnit(node: ScoredNode): SemanticUnit {
   const original = node.unit

   // For section units, reconstruct with pruned children
   if (original instanceof SectionUnit && node.children.length > 0) {
      const reconstructed = SectionUnit.New(
         original.layout,
         original.label,
         node.children.map(child => reconstructUnit(child)),
         original.language
      )
      return reconstructed
   }

   // For leaf units or sections with no surviving children, return as-is
   return original
}
