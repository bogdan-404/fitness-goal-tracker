import { Controller, Get } from '@nestjs/common';

@Controller('status')
export class AppController {
  @Get()
  getStatus() {
    return { status: 'API Gateway is running' };
  }
}