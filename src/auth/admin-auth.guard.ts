import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

require("dotenv").config();

@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const [req] = context.getArgs();
    console.log(req.query);
    return (
      process.env.ADMIN_ACCESS_TOKEN &&
      req.query.accessToken &&
      req.query.accessToken == process.env.ADMIN_ACCESS_TOKEN
    );
  }
}
