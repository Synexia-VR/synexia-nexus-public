import rateLimit from "express-rate-limit";

function createJsonLimiter(opts: {
  windowMs: number;
  max: number;
  message: string;
}) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: opts.message },
  });
}

export const loginLimiter = createJsonLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "too_many_login_attempts",
});

export const registerLimiter = createJsonLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "too_many_register_attempts",
});

export const mutationLimiter = createJsonLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "too_many_requests",
});

export const refreshLimiter = createJsonLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "too_many_refresh_attempts",
});
