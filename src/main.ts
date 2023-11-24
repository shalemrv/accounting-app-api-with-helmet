import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { E_TOO_MANY_REQUESTS } from "./common/exceptions";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { APP_NAME, APP_DESCRIPTION, APP_VERSION } from "./common/constants";

async function bootstrap() {
  // -- App Instantiation
  const app = await NestFactory.create(AppModule);

  /**
   * Helmet
   *
   * Documentation: https://helmetjs.github.io/
   */
  app.use(
    helmet({
      // Content-Security-Policy
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'", "www.pgmain.com"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", "fonts.google.com"],
          formAction: ["'self'", "www.pgmain2.com"],
          frameAncestors: ["'self'", "www.pgmain.com", "www.pgmain2.com"],
          imgSrc: [`'self'`, "data:", "validator.swagger.io", "www.pgmain.com"],
          objectSrc: ["'none'"],
          scriptSrc: [
            "'self'",
            `https: 'unsafe-inline'`,
            "www.pgmain.com",
            "cdn.jsdelivr.net",
          ],
          scriptSrcAttr: ["'none'"],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          upgradeInsecureRequests: [],
        },
        reportOnly: false,
      },

      /**
       * Cross-Origin-Embedder-Policy: unsafe-none | require-corp | credentialless
       * NOT SET by default.
       * If set to true then default value is 'require-corp' and follows definition in Cross-Origin-Resource-Policy
       */
      crossOriginEmbedderPolicy: { policy: "require-corp" },

      /**
       * Cross-Origin-Opener-Policy: unsafe-none | same-origin-allow-popups | same-origin
       * Default = same-origin
       * Set to false to disable
       */
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },

      /**
       * Cross-Origin-Resource-Policy: same-site | same-origin | cross-origin
       * Default = same-origin
       */
      crossOriginResourcePolicy: { policy: "cross-origin" },

      /**
       * Origin-Agent-Cluster
       * Default = ?1
       * Set to false to disable
       *
       *  originAgentCluster: false,
       *
       */

      /**
       * Referrer-Policy
       * | no-referrer | no-referrer-when-downgrade | origin | origin-when-cross-origin | same-origin | strict-origin | strict-origin-when-cross-origin | unsafe-url
       * Default = no-referrer
       * Set to false to disable
       */
      referrerPolicy: {
        policy: ["origin", "unsafe-url"],
      },

      /**
       * Strict-Transport-Security
       * | max-age=<expire-time>
       * | max-age=<expire-time>; includeSubDomains
       * | max-age=<expire-time>; includeSubDomains; preload
       *
       * Default = max-age=15552000; includeSubDomains
       * Set to false to disable
       */
      strictTransportSecurity: {
        maxAge: 123456,
        includeSubDomains: false,
        preload: true,
      },

      /**
       * X-Content-Type-Options
       *
       * Default = nosniff
       *
       * Set to false to disable
       *
       *
       * xContentTypeOptions: false,
       *
       */

      /**
       * X-DNS-Prefetch-Control | on | off
       * allow: true | false
       *
       * Default = off
       * Set to false to disable
       *
       * !!! Recommended NOT TO USE by MDN Docs !!!
       * It will not work for every user. There may also be large incompatibilities
       * between implementations and the behavior may change in the future.
       */
      xDnsPrefetchControl: { allow: false },

      /**
       * X-Download-Options // Specific to IE8
       *
       * Default = noopen
       *
       * Set to false to disable
       */
      xDownloadOptions: false,

      /**
       * X-Frame-Options | sameorigin | deny
       * Superseded by frameAncestors in Content-Security-Policy
       * Can be used to cover old browsers
       *
       * Default = sameorigin
       *
       * Set to false to disable
       */
      xFrameOptions: { action: "deny" },

      /**
       * X-Permitted-Cross-Domain-Policies
       * | none | master-only | by-content-type | all
       *
       * Default = none
       *
       * Set to false to disable
       *
       */
      xPermittedCrossDomainPolicies: {
        permittedPolicies: "by-content-type",
      },

      /**
       * X-Powered-By
       * Used to remove this header set by default in Express and similar frameweorks
       *
       * Default: Header is removed
       *
       * Set to false to NOT remove the header
       */

      /**
       * X-XSS-Protection
       * | 0 | 1 | 1; mode=block | 1; report=<reporting-uri>
       *
       * Default = 0
       *
       * Set to false to disable // NOT RECOMMENDED
       *
       * xXssProtection: false,
       */
    }),
  );

  // -- Cors setup
  app.enableCors({
    origin: false, // Specify the allowed origins.  I'm setting false to allow requests from any origin
    // Find more configuration options here: https://github.com/expressjs/cors#configuration-options
  });

  // -- Rate limiting: Limits the number of requests from the same IP in a period of time.
  // -- More at: https://www.npmjs.com/package/express-rate-limit
  app.use(
    rateLimit({
      windowMs: 5000, // // 10 * 60 * 1000, // 10 minutes
      max: 1, // 100, // Limit each IP to 100 requests per `window` (here, per 10 minutes)
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers,
      skipSuccessfulRequests: false, // The counting will skip all successful requests and just count the errors. Instead of removing rate-limiting, it's better to set this to true to limit the number of times a request fails. Can help prevent against brute-force attacks
      message: { message: E_TOO_MANY_REQUESTS, statusCode: 403 },
    }),
  );

  // -- Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription(APP_DESCRIPTION)
    .setVersion(APP_VERSION)
    .addBearerAuth() // The API will use Bearer Authentication
    .addBasicAuth({ type: "apiKey", name: "accessToken", in: "query" }) // The API will use basic authentication for admin access
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  // -- Start listening
  await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3000);
}
bootstrap();
