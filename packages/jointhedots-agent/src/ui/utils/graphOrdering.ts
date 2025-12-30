


export enum GraphNodeStatus {
   NotProcessed,
   Processing,
   Completed,
}

export class GraphNode<Data> {
   status: GraphNodeStatus = GraphNodeStatus.NotProcessed
   index: number = 0
   lowlink: number = 0
   connected: GraphNode<Data> = null
   data: Data
   constructor(data: Data) {
      this.data = data
   }
}

export class GraphComponent<Data> {
   groupId: number
   connecteds: GraphNode<Data> = null
   constructor(groupId: number) {
      this.groupId = groupId
   }
}

export type ForeachSuccessorsType<Data> = (data: Data, visitor: (data: Data) => void) => void

export class GraphOrderingAlgorithm<Data> {
   nodes: Map<Data, GraphNode<Data>> = new Map()
   components: GraphComponent<Data>[] = []

   private _counter: number = 0
   private _stack: GraphNode<Data>[]
   private _successors: ForeachSuccessorsType<Data>

   constructor(successors: ForeachSuccessorsType<Data>) {
      this._successors = successors
   }
   addNode(data: Data) {
      this.nodes.set(data, new GraphNode(data))
   }
   process() {
      if (this._counter) throw new Error("already processed")
      this._stack = []
      for (const entry of this.nodes.values()) {
         if (entry.status === GraphNodeStatus.NotProcessed) {
            this._processNode(entry)
         }
      }
   }
   print() {
      for (const component of this.components) {
         const v = component.connecteds
         console.log(`group: ${component.groupId} ", node: ${v.data}`)
         for (let v = component.connecteds.connected; v; v = v.connected) {
            console.log(`     + node: ${v.data}`)
         }
      }
   }

   private _processNode(v: GraphNode<Data>) {
      v.status = GraphNodeStatus.Processing;
      v.index = this._counter;
      v.lowlink = this._counter;
      this._stack.push(v);
      this._counter++;

      this._successors(v.data, (succ) => {
         const w = this.nodes.get(succ);
         if (!w) {
            return // Ignore unregistered successor
         }
         else if (w.status === GraphNodeStatus.NotProcessed) {
            this._processNode(w);
            v.lowlink = Math.min(v.lowlink, w.lowlink);
         }
         else if (w.status === GraphNodeStatus.Processing) {
            v.lowlink = Math.min(v.lowlink, w.index);
         }
      })

      if (v.lowlink == v.index) {
         const component = new GraphComponent<Data>(this.components.length)
         do {
            const w = this._stack.pop()
            w.status = GraphNodeStatus.Completed;
            w.connected = component.connecteds;
            component.connecteds = w
         } while (component.connecteds != v)
         this.components.push(component)
      }
   }
}