
export interface ICommandPipe {
   execute<C extends Cmdlet>(payload: CmdPayload<C>): Promise<CmdResult<C>>
}

export type Cmdlet<CmdPayload = any, CmdResult = any> = { payload: CmdPayload, result: CmdResult }
export type CmdPayload<C extends Cmdlet> = C extends { payload: infer P } ? P : void
export type CmdResult<C extends Cmdlet> = C extends { result: infer P } ? P : void
export type CommandExecutor<C extends Cmdlet> = (cmd: CmdPayload<C>, socket: ICommandPipe) => Promise<CmdResult<C>>
