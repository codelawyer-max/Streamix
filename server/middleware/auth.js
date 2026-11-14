import jwt from "jsonwebtoken";

// Our own login token. It is issued ONLY after the server has verified the
// Google sign-in (and the OTP when one is needed). Every protected route
// then trusts this token instead of a userId sent by the browser.
//
// Needs the JWT_SECRET environment variable (a long random string).

const TOKEN_LIFETIME = "7d";

export const signToken = (userId) =>
    jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
        expiresIn: TOKEN_LIFETIME,
    });

const readToken = (req) => {
    const header = req.headers.authorization || "";

    return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
};

const decodeToken = (token) => {
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        return payload?.sub ? String(payload.sub) : null;
    } catch {
        return null;
    }
};

// Rejects the request unless it carries a valid login token.
// Sets req.userId, and overwrites any userId in the body so a client can
// never act as somebody else.
export const requireAuth = (req, res, next) => {
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not set");

        return res.status(503).json({
            message: "Login is not available right now. Please try again later.",
        });
    }

    const token = readToken(req);
    const userId = token ? decodeToken(token) : null;

    if (!userId) {
        return res.status(401).json({
            code: "AUTH_REQUIRED",
            message: "Please log in again.",
        });
    }

    req.userId = userId;

    if (req.body && typeof req.body === "object") {
        req.body.userId = userId;
    }

    next();
};

// Same as requireAuth but lets anonymous visitors through (req.userId = null)
export const optionalAuth = (req, res, next) => {
    const token = readToken(req);

    req.userId =
        token && process.env.JWT_SECRET ? decodeToken(token) : null;

    next();
};

// Use after requireAuth on routes like /status/:userId
export const requireSelf = (paramName) => (req, res, next) => {
    if (String(req.params[paramName]) !== String(req.userId)) {
        return res.status(403).json({
            message: "You can only access your own data.",
        });
    }

    next();
};
