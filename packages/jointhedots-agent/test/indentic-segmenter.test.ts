import { describe, it, before } from 'node:test'
import assert from 'node:assert'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { segmentIndenticCode } from '../src/services/semantic/segmenters/indentic'
import { SectionUnit } from '../src/services/semantic/units'
import { setupResultDir, trace, countSegments } from './helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const RESULT_DIR = join(__dirname, 'results', 'indentic')

describe('indentic-segmenter', () => {

   before(() => setupResultDir(RESULT_DIR))

   describe('simple cases', () => {
      it('should segment flat code with no indentation', () => {
         const code = `const a = 1
const b = 2
const c = 3`
         const result = segmentIndenticCode(code)
         trace(RESULT_DIR, 'simple-flat', code, result)
      })

      it('should segment single nested block', () => {
         const code = `function hello() {
   console.log("hi")
}`
         const result = segmentIndenticCode(code)
         trace(RESULT_DIR, 'simple-nested', code, result)
      })
   })

   describe('python', () => {
      it('should segment complex Python code', () => {
         const code = `import asyncio
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class Config:
    host: str
    port: int
    debug: bool = False

class AsyncEventProcessor:
    def __init__(self, config: Config):
        self.config = config
        self.handlers: Dict[str, List[callable]] = {}
        self._running = False

    async def start(self):
        self._running = True
        while self._running:
            try:
                event = await self._poll_event()
                if event:
                    await self._dispatch(event)
            except Exception as e:
                if self.config.debug:
                    print(f"Error: {e}")
                continue

    async def _poll_event(self) -> Optional[Dict[str, Any]]:
        await asyncio.sleep(0.1)
        return None

    async def _dispatch(self, event: Dict[str, Any]):
        event_type = event.get('type', 'unknown')
        handlers = self.handlers.get(event_type, [])
        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as e:
                self._log_error(e, event)

    def _log_error(self, error: Exception, context: Any):
        if self.config.debug:
            print(f"Handler error: {error}")
            print(f"Context: {context}")

    def register(self, event_type: str, handler: callable):
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)

    def stop(self):
        self._running = False

async def main():
    config = Config(host="localhost", port=8080, debug=True)
    processor = AsyncEventProcessor(config)
    
    @processor.register('message')
    async def handle_message(event):
        print(f"Received: {event}")
    
    await processor.start()

if __name__ == '__main__':
    asyncio.run(main())`

         const result = segmentIndenticCode(code)
         trace(RESULT_DIR, 'python-complex', code, result)
      })
   })

   describe('javascript', () => {
      it('should segment complex JavaScript code', () => {
         const code = `class StateMachine {
   constructor(initialState) {
      this.state = initialState
      this.transitions = new Map()
      this.listeners = new Set()
      this.history = []
   }

   addTransition(from, event, to, guard = null) {
      const key = \`\${from}:\${event}\`
      if (!this.transitions.has(key)) {
         this.transitions.set(key, [])
      }
      this.transitions.get(key).push({ to, guard })
   }

   async dispatch(event, payload = {}) {
      const key = \`\${this.state}:\${event}\`
      const candidates = this.transitions.get(key) || []
      
      for (const { to, guard } of candidates) {
         if (guard && !guard(this.state, payload)) {
            continue
         }
         
         const prevState = this.state
         this.history.push({
            from: prevState,
            to,
            event,
            timestamp: Date.now()
         })
         
         this.state = to
         await this._notifyListeners(prevState, to, event)
         return true
      }
      return false
   }

   async _notifyListeners(from, to, event) {
      const notification = { from, to, event }
      for (const listener of this.listeners) {
         try {
            if (listener.constructor.name === 'AsyncFunction') {
               await listener(notification)
            } else {
               listener(notification)
            }
         } catch (err) {
            console.error('Listener error:', err)
         }
      }
   }

   subscribe(listener) {
      this.listeners.add(listener)
      return () => this.listeners.delete(listener)
   }

   getHistory(limit = 10) {
      return this.history.slice(-limit)
   }
}

const machine = new StateMachine('idle')
machine.addTransition('idle', 'start', 'running')
machine.addTransition('running', 'pause', 'paused')
machine.addTransition('paused', 'resume', 'running')
machine.addTransition('running', 'stop', 'idle', (state, { force }) => force || true)

machine.subscribe(({ from, to }) => {
   console.log(\`State changed: \${from} -> \${to}\`)
})`

         const result = segmentIndenticCode(code)
         trace(RESULT_DIR, 'javascript-complex', code, result)
      })
   })

   describe('rust', () => {
      it('should segment complex Rust code', () => {
         const code = `use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::thread;

pub trait MessageHandler: Send + Sync {
    fn handle(&self, msg: &Message) -> Result<(), Error>;
}

#[derive(Debug, Clone)]
pub struct Message {
    pub id: u64,
    pub topic: String,
    pub payload: Vec<u8>,
}

#[derive(Debug)]
pub enum Error {
    HandlerNotFound,
    ProcessingFailed(String),
}

pub struct MessageBroker {
    handlers: Arc<Mutex<HashMap<String, Vec<Box<dyn MessageHandler>>>>>,
    message_count: Arc<Mutex<u64>>,
}

impl MessageBroker {
    pub fn new() -> Self {
        MessageBroker {
            handlers: Arc::new(Mutex::new(HashMap::new())),
            message_count: Arc::new(Mutex::new(0)),
        }
    }

    pub fn subscribe<H>(&self, topic: &str, handler: H)
    where
        H: MessageHandler + 'static,
    {
        let mut handlers = self.handlers.lock().unwrap();
        handlers
            .entry(topic.to_string())
            .or_insert_with(Vec::new)
            .push(Box::new(handler));
    }

    pub fn publish(&self, topic: &str, payload: Vec<u8>) -> Result<(), Error> {
        let handlers = self.handlers.lock().unwrap();
        let topic_handlers = handlers
            .get(topic)
            .ok_or(Error::HandlerNotFound)?;

        let mut count = self.message_count.lock().unwrap();
        *count += 1;
        let msg = Message {
            id: *count,
            topic: topic.to_string(),
            payload,
        };

        for handler in topic_handlers {
            match handler.handle(&msg) {
                Ok(_) => continue,
                Err(e) => {
                    eprintln!("Handler error: {:?}", e);
                    return Err(Error::ProcessingFailed(
                        format!("Failed processing message {}", msg.id)
                    ));
                }
            }
        }
        Ok(())
    }

    pub fn spawn_worker(&self) -> thread::JoinHandle<()> {
        let handlers = Arc::clone(&self.handlers);
        let count = Arc::clone(&self.message_count);
        
        thread::spawn(move || {
            loop {
                let c = count.lock().unwrap();
                if *c > 1000 {
                    break;
                }
                drop(c);
                thread::sleep(std::time::Duration::from_millis(10));
            }
        })
    }
}

impl Default for MessageBroker {
    fn default() -> Self {
        Self::new()
    }
}`

         const result = segmentIndenticCode(code)
         trace(RESULT_DIR, 'rust-complex', code, result)
      })
   })

   describe('cpp', () => {
      it('should segment complex C++ code', () => {
         const code = `#include <iostream>
#include <memory>
#include <vector>
#include <functional>
#include <unordered_map>

namespace patterns {

template<typename T>
class Observable {
public:
    using Observer = std::function<void(const T&)>;
    using ObserverId = size_t;

    ObserverId subscribe(Observer observer) {
        auto id = nextId_++;
        observers_[id] = std::move(observer);
        return id;
    }

    void unsubscribe(ObserverId id) {
        observers_.erase(id);
    }

    void notify(const T& value) {
        for (const auto& [id, observer] : observers_) {
            try {
                observer(value);
            } catch (const std::exception& e) {
                std::cerr << "Observer " << id << " error: " << e.what() << std::endl;
            }
        }
    }

private:
    std::unordered_map<ObserverId, Observer> observers_;
    ObserverId nextId_ = 0;
};

template<typename T>
class ObjectPool {
public:
    explicit ObjectPool(size_t initialSize = 10) {
        for (size_t i = 0; i < initialSize; ++i) {
            pool_.push_back(std::make_unique<T>());
        }
    }

    std::unique_ptr<T> acquire() {
        if (pool_.empty()) {
            return std::make_unique<T>();
        }
        auto obj = std::move(pool_.back());
        pool_.pop_back();
        return obj;
    }

    void release(std::unique_ptr<T> obj) {
        if (obj) {
            pool_.push_back(std::move(obj));
        }
    }

    size_t available() const {
        return pool_.size();
    }

private:
    std::vector<std::unique_ptr<T>> pool_;
};

class EventSystem {
public:
    struct Event {
        std::string type;
        std::unordered_map<std::string, std::string> data;
    };

    void emit(const std::string& type, 
              const std::unordered_map<std::string, std::string>& data = {}) {
        Event event{type, data};
        observable_.notify(event);
    }

    auto on(Observable<Event>::Observer handler) {
        return observable_.subscribe(std::move(handler));
    }

private:
    Observable<Event> observable_;
};

} // namespace patterns

int main() {
    using namespace patterns;
    
    EventSystem events;
    auto id = events.on([](const EventSystem::Event& e) {
        std::cout << "Event: " << e.type << std::endl;
        for (const auto& [key, value] : e.data) {
            std::cout << "  " << key << ": " << value << std::endl;
        }
    });
    
    events.emit("startup", {{"version", "1.0"}, {"mode", "debug"}});
    return 0;
}`

         const result = segmentIndenticCode(code)
         trace(RESULT_DIR, 'cpp-complex', code, result)
      })
   })

   describe('yaml', () => {
      it('should segment complex YAML configuration', () => {
         const code = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: microservice-app
  namespace: production
  labels:
    app: microservice
    environment: production
    team: backend
  annotations:
    kubernetes.io/change-cause: "Initial deployment"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: microservice
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: microservice
    spec:
      serviceAccountName: microservice-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: app
          image: registry.example.com/app:v1.2.3
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
            - name: metrics
              containerPort: 9090
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
            - name: LOG_LEVEL
              value: "info"
            - name: CACHE_TTL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: cache-ttl
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health/live
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: config-volume
              mountPath: /etc/config
              readOnly: true
            - name: secrets-volume
              mountPath: /etc/secrets
              readOnly: true
        - name: sidecar
          image: registry.example.com/sidecar:v1.0.0
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
      volumes:
        - name: config-volume
          configMap:
            name: app-config
        - name: secrets-volume
          secret:
            secretName: app-secrets
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: microservice
                topologyKey: kubernetes.io/hostname`

         const result = segmentIndenticCode(code)
         trace(RESULT_DIR, 'yaml-complex', code, result)
      })
   })
})
