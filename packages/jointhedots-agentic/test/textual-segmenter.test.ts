import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { segmentText, detectFormat } from '../src/services/semantic/textual-segmenter'
import { TextualUnit, SectionUnit, SemanticUnit } from '../src/services/semantic/units'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const RESULT_DIR = join(__dirname, 'results')

function trace(name: string, origin: string, result: SemanticUnit) {
   const output = `${origin}\n\n---\n\n${JSON.stringify(result, null, 2)}`
   writeFileSync(join(RESULT_DIR, `${name}.txt`), output, 'utf-8')
}

describe('textual-segmenter', () => {

   before(() => {
      rmSync(RESULT_DIR, { recursive: true, force: true })
      mkdirSync(RESULT_DIR, { recursive: true })
   })

   describe('detectFormat', () => {
      it('should detect markdown', async () => {
         const format = await detectFormat('# Hello\n\nThis is **bold** text')
         assert.strictEqual(format, 'md')
      })

      it('should detect html', async () => {
         const format = await detectFormat('<html><body><h1>Hello</h1></body></html>')
         assert.strictEqual(format, 'html')
      })
   })

   describe('segmentMarkdown', () => {
      it('should segment simple markdown with headings', async () => {
         const md = `# Title

Introduction paragraph.

## Section 1

Content of section 1.

## Section 2

Content of section 2.

### Subsection 2.1

Nested content.`

         const unit = TextualUnit.New(md, 'md')
         const result = await segmentText(unit)

         trace('markdown-simple', md, result)

         assert.ok(result instanceof SectionUnit)
         const section = result as SectionUnit
         assert.ok(section.content.length > 0)
      })

      it('should handle complex nested markdown', async () => {
         const md = `# Main Document

This is the introduction with **bold**, *italic*, and \`code\`.

## Chapter 1: Getting Started

Some introductory text here.

### 1.1 Prerequisites

- Item 1
- Item 2
- Item 3

### 1.2 Installation

\`\`\`bash
npm install package
\`\`\`

## Chapter 2: Advanced Topics

More complex material.

### 2.1 Configuration

| Option | Default | Description |
|--------|---------|-------------|
| debug  | false   | Enable debug |
| port   | 3000    | Server port |

### 2.2 API Reference

#### 2.2.1 Methods

The \`init()\` method starts everything.

#### 2.2.2 Events

Events are emitted asynchronously.

## Chapter 3: Conclusion

Final thoughts and [links](https://example.com).

###### Deep heading level 6

Very deep content.`

         const unit = TextualUnit.New(md, 'md')
         const result = await segmentText(unit)

         trace('markdown-complex', md, result)

         assert.ok(result instanceof SectionUnit)
         const root = result as SectionUnit
         assert.ok(root.content.length >= 1)
      })
   })

   describe('segmentHtml', () => {
      it('should segment simple html with headings', async () => {
         const html = `<h1>Title</h1>
<p>Introduction.</p>
<h2>Section 1</h2>
<p>Content.</p>`

         const unit = TextualUnit.New(html, 'html')
         const result = await segmentText(unit)

         trace('html-simple', html, result)

         assert.ok(result instanceof SectionUnit)
      })

      it('should handle complex nested html', async () => {
         const html = `<!DOCTYPE html>
<html lang="en">
<head>
   <title>Complex Document</title>
</head>
<body>
   <header>
      <h1>Main Document Title</h1>
      <nav>
         <a href="#chapter1">Chapter 1</a>
         <a href="#chapter2">Chapter 2</a>
      </nav>
   </header>
   
   <main>
      <article id="chapter1">
         <h2>Chapter 1: Introduction</h2>
         <p>This is the <strong>first</strong> chapter with <em>emphasis</em>.</p>
         
         <section>
            <h3>1.1 Background</h3>
            <p>Some background information.</p>
            <ul>
               <li>Point one</li>
               <li>Point two</li>
               <li>Point three</li>
            </ul>
         </section>
         
         <section>
            <h3>1.2 Objectives</h3>
            <p>Our main objectives are:</p>
            <ol>
               <li>First objective</li>
               <li>Second objective</li>
            </ol>
         </section>
      </article>
      
      <article id="chapter2">
         <h2>Chapter 2: Deep Dive</h2>
         <p>Advanced content here.</p>
         
         <section>
            <h3>2.1 Technical Details</h3>
            <pre><code>
function example() {
   return "hello";
}
            </code></pre>
            
            <h4>2.1.1 Implementation Notes</h4>
            <p>Important implementation details.</p>
            
            <h4>2.1.2 Performance Considerations</h4>
            <table>
               <thead>
                  <tr><th>Metric</th><th>Value</th></tr>
               </thead>
               <tbody>
                  <tr><td>Speed</td><td>Fast</td></tr>
                  <tr><td>Memory</td><td>Low</td></tr>
               </tbody>
            </table>
         </section>
         
         <section>
            <h3>2.2 Best Practices</h3>
            <blockquote>
               <p>Always follow best practices.</p>
            </blockquote>
         </section>
      </article>
   </main>
   
   <aside>
      <h2>Related Links</h2>
      <ul>
         <li><a href="#">Link 1</a></li>
         <li><a href="#">Link 2</a></li>
      </ul>
   </aside>
   
   <footer>
      <h6>Copyright 2025</h6>
      <p>All rights reserved.</p>
   </footer>
</body>
</html>`

         const unit = TextualUnit.New(html, 'html')
         const result = await segmentText(unit)

         trace('html-complex', html, result)

         assert.ok(result instanceof SectionUnit)
         const root = result as SectionUnit
         assert.ok(root.content.length >= 1)
      })

      it('should handle html fragments', async () => {
         const html = `<section>
   <h2>Features</h2>
   <div class="feature">
      <h3>Feature 1</h3>
      <p>Description of feature 1.</p>
   </div>
   <div class="feature">
      <h3>Feature 2</h3>
      <p>Description of feature 2.</p>
   </div>
</section>
<section>
   <h2>Pricing</h2>
   <p>Contact us for pricing.</p>
</section>`

         const unit = TextualUnit.New(html, 'html')
         const result = await segmentText(unit)

         trace('html-fragments', html, result)

         assert.ok(result instanceof SectionUnit)
      })
   })

   describe('segmentCode', () => {
      it('should segment TypeScript code', async () => {
         const code = `import { foo } from './foo'

export interface User {
   id: string
   name: string
}

export class UserService {
   private users: User[] = []

   constructor() {
      this.users = []
   }

   async getUser(id: string): Promise<User | null> {
      return this.users.find(u => u.id === id) || null
   }

   addUser(user: User): void {
      this.users.push(user)
   }
}

export function createUser(name: string): User {
   return { id: Math.random().toString(), name }
}

const DEFAULT_USER: User = { id: '0', name: 'Guest' }`

         const unit = TextualUnit.New(code, 'ts')
         const result = await segmentText(unit)

         trace('code-typescript', code, result)

         assert.ok(result instanceof SectionUnit)
         const section = result as SectionUnit
         assert.ok(section.content.length > 0)
      })

      it('should segment JavaScript code', async () => {
         const code = `class Calculator {
   constructor(value = 0) {
      this.value = value
   }

   add(n) {
      this.value += n
      return this
   }

   subtract(n) {
      this.value -= n
      return this
   }
}

function fibonacci(n) {
   if (n <= 1) return n
   return fibonacci(n - 1) + fibonacci(n - 2)
}

const calc = new Calculator(10)`

         const unit = TextualUnit.New(code, 'js')
         const result = await segmentText(unit)

         trace('code-javascript', code, result)

         assert.ok(result instanceof SectionUnit)
      })

      it('should segment Python code', async () => {
         const code = `import os
from typing import List, Optional

class DataProcessor:
   def __init__(self, data: List[str]):
      self.data = data
      self.processed = []

   def process(self) -> List[str]:
      for item in self.data:
         self.processed.append(item.upper())
      return self.processed

   @staticmethod
   def validate(item: str) -> bool:
      return len(item) > 0

def main():
   processor = DataProcessor(['hello', 'world'])
   result = processor.process()
   print(result)

if __name__ == '__main__':
   main()`

         const unit = TextualUnit.New(code, 'py')
         const result = await segmentText(unit)

         trace('code-python', code, result)

         assert.ok(result instanceof SectionUnit)
      })

      it('should segment C++ code', async () => {
         const code = `#include <iostream>
#include <vector>
#include <string>

namespace utils {

class StringHelper {
public:
   StringHelper() {}
   
   std::string toUpper(const std::string& str) {
      std::string result = str;
      for (auto& c : result) {
         c = toupper(c);
      }
      return result;
   }

   static bool isEmpty(const std::string& str) {
      return str.empty();
   }
};

} // namespace utils

int main() {
   utils::StringHelper helper;
   std::cout << helper.toUpper("hello") << std::endl;
   return 0;
}`

         const unit = TextualUnit.New(code, 'cpp')
         const result = await segmentText(unit)

         trace('code-cpp', code, result)

         assert.ok(result instanceof SectionUnit)
      })

      it('should segment Rust code', async () => {
         const code = `use std::collections::HashMap;

pub struct Cache<T> {
   data: HashMap<String, T>,
   capacity: usize,
}

impl<T: Clone> Cache<T> {
   pub fn new(capacity: usize) -> Self {
      Cache {
         data: HashMap::new(),
         capacity,
      }
   }

   pub fn get(&self, key: &str) -> Option<T> {
      self.data.get(key).cloned()
   }

   pub fn set(&mut self, key: String, value: T) {
      if self.data.len() >= self.capacity {
         self.data.clear();
      }
      self.data.insert(key, value);
   }
}

fn main() {
   let mut cache: Cache<i32> = Cache::new(10);
   cache.set("key".to_string(), 42);
}`

         const unit = TextualUnit.New(code, 'rust')
         const result = await segmentText(unit)

         trace('code-rust', code, result)

         assert.ok(result instanceof SectionUnit)
      })

      it('should segment Go code', async () => {
         const code = `package main

import (
   "fmt"
   "sync"
)

type Counter struct {
   mu    sync.Mutex
   value int
}

func NewCounter() *Counter {
   return &Counter{value: 0}
}

func (c *Counter) Increment() {
   c.mu.Lock()
   defer c.mu.Unlock()
   c.value++
}

func (c *Counter) Value() int {
   c.mu.Lock()
   defer c.mu.Unlock()
   return c.value
}

func main() {
   counter := NewCounter()
   counter.Increment()
   fmt.Println(counter.Value())
}`

         const unit = TextualUnit.New(code, 'go')
         const result = await segmentText(unit)

         trace('code-go', code, result)

         assert.ok(result instanceof SectionUnit)
      })
   })
})
