
export const print: {
    log(...args)
    debug(...args)
    warning(...args)
    error(...args)
    success(...args)
    title(...args)
    info(...args)
    exception(exception: Error)
} = {
    log: console.log,
    debug: console.info,
    warning: console.warn,
    error: console.error,
    success: console.info,
    title: console.info,
    info: console.info,
    exception: console.error,
}

export class ConsoleTable {
    constructor(readonly sizes: number[]) {
    }
    head(...cells: any[]) {
        console.log(makeTableTop(this.sizes))
        this.row(...cells)
        console.log(makeTableMiddle(this.sizes))
    }
    row(...cells: any[]) {
        const cols = []
        for (let i = 0; i < this.sizes.length; i++) {
            const value = makeCellValue(cells[i], this.sizes[i])
            cols.push(value)
        }
        console.log("│ " + cols.join(" │ ") + " │")
    }
    end() {
        console.log(makeTableBottom(this.sizes))
    }
}

function makeTableTop(sizes: number[]): string {
    const cols = []
    for (let i = 0; i < sizes.length; i++) {
        cols.push("".padEnd(sizes[i] + 2, '─'))
    }
    return "┌" + cols.join("┬") + "┐"
}

function makeTableMiddle(sizes: number[]): string {
    const cols = []
    for (let i = 0; i < sizes.length; i++) {
        cols.push("".padEnd(sizes[i] + 2, '─'))
    }
    return "├" + cols.join("┼") + "┤"
}

function makeTableBottom(sizes: number[]): string {
    const cols = []
    for (let i = 0; i < sizes.length; i++) {
        cols.push("".padEnd(sizes[i] + 2, '─'))
    }
    return "└" + cols.join("┴") + "┘"
}

function makeCellValue(value: any, width: number): string {
    let text: string
    if (typeof value === "string") text = value
    else if (value === undefined) text = "(undefined)"
    else text = stringifyPartialValue(value, width)

    if (text.length <= width) {
        return text.padEnd(width, " ")
    }
    else if (width > 8) {
        return text.slice(0, width - 3) + "..."
    }
    else {
        return text.slice(0, width)
    }
}


function stringifyPartialValue(value: any, width: number): string {
    var text: string = ""
    function stringify(value: any) {
        if (value instanceof Object) {
            if (Array.isArray(value)) {
                let first = true
                text += "["
                for (const item of value) {
                    if (first === false) text += ", "
                    stringify(item)
                    first = false
                    if (text.length > width) throw null
                }
                text += "]"
            }
            else {
                let first = true
                text += "{"
                for (const key in value) {
                    if (first === false) text += ", "
                    text += JSON.stringify(key) + ":"
                    stringify(value[key])
                    first = false
                    if (text.length > width) throw null
                }
                text += "}"
            }
        }
        else {
            text += JSON.stringify(value)
        }
    }
    try {
        stringify(value)
        return text
    }
    catch (e) {
        return text.slice(0, width)
    }
}