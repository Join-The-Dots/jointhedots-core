
export type MatchRule<P> = { name: string, parse: P, entry: RegExp }

export class TokenPattern {
  constructor(
    readonly id: number,
    readonly name: string,
    readonly marker: string,
    readonly parse?: (token: Token) => boolean,
    readonly pattern?: RegExp,
  ) {
    if (!pattern) {
      const escaped = this.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      this.pattern = new RegExp(escaped, "g")
    }
    if (!parse) {
      this.parse = () => true
    }
  }
  createToken(source: TokenStream) {
    return new Token(this, source)
  }
}

export enum TokenBaseId {
  EOF,
  Chunk,
  __next,
}

export class Token {
  id: number = 0
  chunk: Token = null
  start: number = -1
  end: number = -1
  data: any = null
  match: RegExpExecArray = null
  constructor(
    readonly rule: TokenPattern,
    readonly source: TokenStream,
  ) {
    this.id = rule.id
  }
  get raw(): string {
    return this.source.input.slice(this.start, this.end)
  }
  fork(format: TokenizerFormat): TokenStream {
    const { source } = this
    const stream = new TokenStream(source.input, format)
    stream.pos = this.end
    stream.origin = this
    return stream
  }
  toString(): string {
    return `(${this.id}) [${this.rule.name}] ${JSON.stringify(this.raw)}`
  }
  print(): this {
    this.chunk?.print()
    console.log(this.toString())
    return this
  }
}

const EOF = new TokenPattern(TokenBaseId.EOF, "EOF", "")
const Chunk = new TokenPattern(TokenBaseId.Chunk, "chunk", "")

const space_string = /^[\s\t\r\n]*$/

function matchSpaceChunkInto(token: Token, chunk: Token) {
  const test = space_string.test(chunk.data)
  if (!test) {
    throw new Error("Invalid text: " + chunk.data)
  }
}

function matchAnyChunkInto(token: Token, chunk: Token) {
  token.chunk = chunk
}

export class TokenizerFormat {
  charmap = new Map<number, TokenPattern[]>()
  matchChunkInto = matchSpaceChunkInto

  constructor(
    readonly rules: TokenPattern[] = [],
  ) {
  }
  allowAnyChunk() {
    this.matchChunkInto = matchAnyChunkInto
    return this
  }
  add(rule: TokenPattern) {
    if (rule.marker) {
      const ch = rule.marker.charCodeAt(0)
      const items = (this.charmap.get(ch) || [])
      items.push(rule)
      this.charmap.set(ch, items)
    }
    this.rules.push(rule)
  }
  complete() {
    return this
  }
}

export enum MergeKind {
  StreamPosition,
  ChunkStart,
  ChunkEnd,
  TokenStart,
  TokenEnd,
}

export class TokenStream {
  origin: Token = null
  input: string = null
  format: TokenizerFormat = null
  matches: Token[] = []
  pos: number = 0
  end: number = 0

  last: Token = null
  EOF: Token = null
  chunk: Token = null
  retainLast: boolean = false

  constructor(input: string, format: TokenizerFormat) {
    this.format = format
    this.input = input
    this.end = input.length
    this.chunk = Chunk.createToken(this)
    this.EOF = EOF.createToken(this)
    this.matches = format.rules.map(r => r.createToken(this))
  }
  isEOF() {
    return this.pos >= this.end
  }
  fork(format: TokenizerFormat, pos: number, end?: number): TokenStream {
    const stream = new TokenStream(this.input, format)
    stream.pos = pos
    stream.end = end || this.end
    return stream
  }
  reset(pos: number) {
    this.retainLast = false
    if (this.last && pos < this.pos) {
      for (const matched of this.matches) {
        matched.start = 0
      }
    }
    this.pos = pos
  }
  merge(kind: MergeKind) {
    if (this.origin) {
      let pos = this.pos
      switch (kind) {
        case MergeKind.ChunkStart:
          if (this.last?.chunk) {
            pos = this.last.chunk.start
            break
          }
        case MergeKind.ChunkEnd:
          if (this.last?.chunk) {
            pos = this.last.chunk.end
            break
          }
        case MergeKind.TokenStart:
          if (this.last) {
            pos = this.last.start
            break
          }
        case MergeKind.TokenEnd:
          if (this.last) {
            pos = this.last.end
            break
          }
      }
      this.origin.end = pos
      this.origin.source.reset(pos)
    }
    else {
      throw new Error(`No stream origin`)
    }
  }
  retain() {
    this.retainLast = true
  }
  next<P>(): Token {
    const { input, matches } = this

    if (this.retainLast) {
      this.retainLast = false
      return this.last
    }

    let cur = this.pos
    while (cur < this.end) {

      let matched = matches[0]
      if (matched.start < cur) {
        for (let i = 0; i < matches.length && matches[i].start < cur; i++) {
          const tok = this.matches[i]
          const { pattern } = tok.rule
          pattern.lastIndex = cur
          tok.match = pattern.exec(input)
          if (tok.match && tok.match.index < this.end) {
            tok.start = tok.match.index
            tok.end = tok.start + tok.match[0].length
          }
          else {
            tok.start = this.end + 1
            tok.end = tok.start
          }
        }
        matches.sort((a, b) => a.start - b.start)
        matched = matches[0]
      }

      if (matched.start < this.end) {
        cur = matched.start
      }
      else break

      let mindex = 0
      const start = this.pos
      while (matched.start === cur) {
        if (matched.rule.parse(matched) === true) {
          matched.chunk = null
          if (start < cur) {
            const { chunk, format } = this
            chunk.start = start
            chunk.end = cur
            chunk.data = chunk.raw
            format.matchChunkInto(matched, chunk)
          }
          this.pos = matched.end
          return this.last = matched
        }
        matched = matches[++mindex]
      }
      cur++
    }

    const matched = this.EOF
    if (this.pos < this.end) {
      const { chunk } = this
      chunk.start = this.pos
      chunk.end = this.end
      chunk.data = chunk.raw
      matched.chunk = chunk
    }
    else {
      matched.chunk = null
    }
    this.pos = this.end
    return this.last = matched
  }

}
