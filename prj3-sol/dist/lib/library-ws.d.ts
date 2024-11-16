import Express from 'express';
import { LendingLibrary } from 'lending-library';
export type App = Express.Application;
type ServeRet = {
    app: App;
    close: () => void;
};
type SERVER_OPTIONS = {
    base?: string;
};
export declare function serve(model: LendingLibrary, options?: SERVER_OPTIONS): ServeRet;
export {};
//# sourceMappingURL=library-ws.d.ts.map