import cors from 'cors';
import Express from 'express';
import STATUS from 'http-status';
import { Errors } from 'cs544-js-utils';
import { DEFAULT_INDEX, DEFAULT_COUNT } from './params.js';
export function serve(model, options = {}) {
    const app = Express();
    app.locals.model = model;
    const { base = '/api', } = options;
    app.locals.base = base;
    setupRoutes(app);
    const close = () => app.locals.sessions.close();
    return { app, close };
}
function setupRoutes(app) {
    const base = app.locals.base;
    //allow cross-origin resource sharing
    app.use(cors(CORS_OPTIONS));
    //assume that all request bodies are parsed as JSON
    app.use(Express.json());
    //if uncommented, all requests are traced on the console
    //app.use(doTrace(app));
    //set up application routes
    //TODO: set up application routes
    app.put(`${base}/books`, addBook); // Add book
    app.get(`${base}/books/:isbn`, getBook); // Get book by ISBN
    //app.get(`${base}/books`, findBooks); // Find books
    app.get(`${base}/books`, doFindBook(app));
    //app.put(`${base}/lendings`, checkoutBook); // Checkout a book
    app.put(`${base}/lendings`, doCheckoutBook(app));
    app.delete(`${base}/lendings`, doReturnBook(app)); // Return a book
    app.delete(`${base}`, clearLibrary); // Clear library
    //must be last
    app.use(do404(app)); //custom handler for page not found
    app.use(doErrors(app)); //custom handler for internal errors
}
//TODO: set up route handlers
// Handlers for the routes
async function addBook(req, res) {
    const book = req.body;
    // Implement logic to add book to the library
    const result = await req.app.locals.model.addBook(book);
    if (result.isOk) {
        const location = `${req.protocol}://${req.get('host')}${req.originalUrl}/${result.val.isbn}`;
        res.status(STATUS.CREATED).location(location).json(selfResult(req, result.val));
    }
    else {
        res.status(STATUS.BAD_REQUEST).json(mapResultErrors(result));
    }
}
async function getBook(req, res) {
    const isbn = req.params.isbn;
    const result = await req.app.locals.model.getBook(isbn);
    if (result.isOk) {
        res.status(STATUS.OK).json(selfResult(req, result.val));
    }
    else {
        res.status(STATUS.NOT_FOUND).json(mapResultErrors(result));
    }
}
//find book web service
function doFindBook(app) {
    return (async function (req, res) {
        try {
            const q = { ...req.query };
            const index = Number(q.index ?? DEFAULT_INDEX);
            const count = Number(q.count ?? DEFAULT_COUNT);
            //by requesting one extra result, we ensure that we generate the
            //next link only if there are more than count remaining results
            const q1 = { ...q, count: count + 1, index, };
            const result = await app.locals.model.findBooks(q1);
            if (!result.isOk)
                throw result;
            const response = pagedResult(req, 'isbn', result.val);
            res.json(response);
        }
        catch (err) {
            const mapped = mapResultErrors(err);
            res.status(mapped.status).json(mapped);
        }
    });
}
/*async function findBooks(req: Express.Request, res: Express.Response): Promise<void> {
  const typedReq = req as RequestWithQuery; // assert req as RequestWithQuery
  const searchParam = typedReq.query.search;

  // Ensure `search` is a single string, defaulting to an empty string if not
  const search = typeof searchParam === 'string' ? searchParam.trim() : '';

  const index = Number(typedReq.query.index || DEFAULT_INDEX);
  const count = Number(typedReq.query.count || DEFAULT_COUNT);

  // Validate search input
  if (!search) {
    res.status(STATUS.BAD_REQUEST).json({
      isOk: false,
      status: STATUS.BAD_REQUEST,
      errors: [{ message: 'Search term is required and cannot be empty or whitespace.' }],
    });
    return;
  }

  // Fetch results from model with search and pagination
  const results = await req.app.locals.model.findBooks({ search, index, count });
  
  if (results.isOk) {
    res.status(STATUS.OK).json(pagedResult(typedReq, 'isbn', results.val));
  } else {
    res.status(STATUS.BAD_REQUEST).json(mapResultErrors(results));
  }
}*/
function doCheckoutBook(app) {
    return (async function (req, res) {
        try {
            const { isbn, patronId } = req.body;
            //console.log('Checkout Request:', req.body);
            // Validate required fields
            if (!isbn || !patronId) {
                res.status(STATUS.BAD_REQUEST).json({
                    isOk: false,
                    status: STATUS.BAD_REQUEST,
                    errors: [{ message: 'Missing required fields: isbn and patronId.' }],
                });
                return; // Return to exit the function
            }
            // Call the checkoutBook service provided by app.locals.model
            const checkoutResult = await app.locals.model.checkoutBook(req.body);
            //console.log('Checkout Result:', checkoutResult);
            //console.log("Checkout Result:", checkoutResult); // Log the result of the checkout
            if (!checkoutResult.isOk) {
                throw checkoutResult;
            }
            res.location(selfHref(req, req.body.isbn));
            const response = selfResult(req, checkoutResult.val);
            res.status(STATUS.OK).json(response);
        }
        catch (err) {
            const mapped = mapResultErrors(err);
            res.status(mapped.status).json(mapped);
        }
    });
}
/*async function checkoutBook(req: Express.Request, res: Express.Response): Promise<void> {
  const { isbn, patronId } = req.body;

  // Validate required fields
  if (!isbn || !patronId) {
    res.status(STATUS.BAD_REQUEST).json({
      isOk: false,
      status: STATUS.BAD_REQUEST,
      errors: [{ message: 'Missing required fields: isbn and patronId.' }],
    });
    return; // Return to exit the function
  }

  const result = await req.app.locals.model.checkoutBook(isbn, patronId);
  if (result.isOk) {
    res.status(STATUS.OK).json(selfResult(req, result.val));
  } else {
    res.status(STATUS.BAD_REQUEST).json(mapResultErrors(result));
  }
}*/
function doReturnBook(app) {
    return (async function (req, res) {
        try {
            const { patronId, isbn } = req.body;
            // Call the returnbook service provided by app.locals.model
            const result = await app.locals.model.returnBook({ ...req.body, isbn, patronId });
            if (!result.isOk)
                throw result;
            const response = selfResult(req, result.val);
            res.json(response);
        }
        catch (err) {
            const mapped = mapResultErrors(err);
            res.status(mapped.status).json(mapped);
        }
    });
}
/*async function returnBook(req: Express.Request, res: Express.Response) {
  const { isbn, patronId } = req.body;
  const result = await req.app.locals.model.returnBook(isbn, patronId);
  if (result.isOk) {
    res.status(STATUS.OK).json(selfResult(req, result.val));
  } else {
    res.status(STATUS.BAD_REQUEST).json(mapResultErrors(result));
  }
}*/
async function clearLibrary(req, res) {
    const result = await req.app.locals.model.clear();
    if (result.isOk) {
        res.status(STATUS.OK).json(selfResult(req, {}));
    }
    else {
        res.status(STATUS.INTERNAL_SERVER_ERROR).json(mapResultErrors(result));
    }
}
/** log request on stdout */
function doTrace(app) {
    return (async function (req, res, next) {
        console.log(req.method, req.originalUrl, req.body ?? {});
        next();
    });
}
/** Default handler for when there is no route for a particular method
 *  and path.
 */
function do404(app) {
    return async function (req, res) {
        const message = `${req.method} not supported for ${req.originalUrl}`;
        const result = {
            status: STATUS.NOT_FOUND,
            errors: [{ options: { code: 'NOT_FOUND' }, message, },],
        };
        res.status(404).json(result);
    };
}
/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */
function doErrors(app) {
    return async function (err, req, res, next) {
        const message = err.message ?? err.toString();
        const [status, code] = (err instanceof SyntaxError)
            ? [STATUS.BAD_REQUEST, 'SYNTAX']
            : [STATUS.INTERNAL_SERVER_ERROR, 'INTERNAL'];
        const result = {
            status: STATUS[status],
            errors: [{ options: { code }, message }],
        };
        res.status(status).json(result);
        if (status === STATUS.INTERNAL_SERVER_ERROR)
            console.error(result.errors);
    };
}
/************************* HATEOAS Utilities ***************************/
/** Return original URL for req */
function requestUrl(req) {
    return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
}
/** Return path for req.  If id specified extend with /id, otherwise add in
 *  any query params.
 */
function selfHref(req, id = '') {
    const url = new URL(requestUrl(req));
    return url.pathname + (id ? `/${id}` : url.search);
}
/** Produce paging link for next (dir === 1), prev (dir === -1)
 *  for req having nResults results.  Return undefined if there
 *  is no such link.  Note that no next link is produced if
 *  nResults <= req.query.count.
 */
function pageLink(req, nResults, dir) {
    const url = new URL(requestUrl(req));
    const count = Number(req.query?.count ?? DEFAULT_COUNT);
    const index0 = Number(url.searchParams.get('index') ?? 0);
    if (dir > 0 ? nResults <= count : index0 <= 0)
        return undefined;
    const index = dir > 0 ? index0 + count : count > index0 ? 0 : index0 - count;
    url.searchParams.set('index', String(index));
    url.searchParams.set('count', String(count));
    return url.pathname + url.search;
}
/** Return a success envelope for a single result. */
function selfResult(req, result, status = STATUS.OK) {
    const method = req.method;
    return { isOk: true,
        status,
        links: { self: { rel: 'self', href: selfHref(req), method } },
        result,
    };
}
/** Return a paged envelope for multiple results for type T.
 *  No next link is produced if results.length <= req.query.count
 *  (this will be correct, if results[] was requested for count + 1).
 */
function pagedResult(req, idKey, results) {
    const nResults = results.length;
    const result = //(T & {links: { self: string } })[]  =
     results.map(r => {
        const selfLinks = { self: { rel: 'self', href: selfHref(req, r[idKey]),
                method: 'GET' } };
        return { result: r, links: selfLinks };
    });
    const links = { self: { rel: 'self', href: selfHref(req), method: 'GET' } };
    const next = pageLink(req, nResults, +1);
    if (next)
        links.next = { rel: 'next', href: next, method: 'GET', };
    const prev = pageLink(req, nResults, -1);
    if (prev)
        links.prev = { rel: 'prev', href: prev, method: 'GET', };
    const count = req.query.count ? Number(req.query.count) : DEFAULT_COUNT;
    return { isOk: true, status: STATUS.OK, links,
        result: result.slice(0, count), };
}
/*************************** Mapping Errors ****************************/
//map from domain errors to HTTP status codes.  If not mentioned in
//this map, an unknown error will have HTTP status BAD_REQUEST.
const ERROR_MAP = {
    EXISTS: STATUS.CONFLICT,
    NOT_FOUND: STATUS.NOT_FOUND,
    BAD_REQ: STATUS.BAD_REQUEST,
    AUTH: STATUS.UNAUTHORIZED,
    DB: STATUS.INTERNAL_SERVER_ERROR,
    INTERNAL: STATUS.INTERNAL_SERVER_ERROR,
};
/** Return first status corresponding to first options.code in
 *  errors, but INTERNAL_SERVER_ERROR dominates other statuses.  Returns
 *  BAD_REQUEST if no code found.
 */
function getHttpStatus(errors) {
    let status = 0;
    for (const err of errors) {
        if (err instanceof Errors.Err) {
            const code = err?.options?.code;
            const errStatus = (code !== undefined) ? ERROR_MAP[code] : -1;
            if (errStatus > 0 && status === 0)
                status = errStatus;
            if (errStatus === STATUS.INTERNAL_SERVER_ERROR)
                status = errStatus;
        }
    }
    return status !== 0 ? status : STATUS.BAD_REQUEST;
}
/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapResultErrors(err) {
    const errors = err instanceof Errors.ErrResult
        ? err.errors
        : [new Errors.Err(err.message ?? err.toString(), { code: 'UNKNOWN' }),];
    const status = getHttpStatus(errors);
    if (status === STATUS.INTERNAL_SERVER_ERROR)
        console.error(errors);
    return { isOk: false, status, errors, };
}
/**************************** CORS Options *****************************/
/** options which affect whether cross-origin (different scheme, domain or port)
 *  requests are allowed
 */
const CORS_OPTIONS = {
    //if localhost origin, reflect back in Access-Control-Allow-Origin res hdr
    // origin: /localhost:\d{4}/,
    // simple reflect req origin hdr back to Access-Control-Allow-Origin res hdr
    origin: true,
    //methods allowed for cross-origin requests
    methods: ['GET', 'PUT',],
    //request headers allowed on cross-origin requests
    //used to allow JSON content
    allowedHeaders: ['Content-Type',],
    //response headers exposed to cross-origin requests
    exposedHeaders: ['Location', 'Content-Type',],
};
//# sourceMappingURL=library-ws.js.map