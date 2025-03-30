

export interface ILogContext {
}

export interface ILog {
    notifyError(error: Error)
}

const collectors: ILog[] = []

export function registerGlobalLogCollector(collector: ILog) {
    collectors.push(collector)
}

export function notifyError(error: Error) {
    for (const collector of collectors) {
        collector.notifyError(error)
    }
}

class ConsoleLog implements ILog {
    notifyError(error: Error) {
        console.log(error)
    }
}

registerGlobalLogCollector(new ConsoleLog())
