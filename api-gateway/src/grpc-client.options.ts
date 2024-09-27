import { ClientOptions, Transport } from '@nestjs/microservices';

export const grpcUserOptions: ClientOptions = {
  transport: Transport.GRPC,
  options: {
    package: 'user_service',
    protoPath: './proto/user_service.proto',
  },
};

export const grpcActivityOptions: ClientOptions = {
  transport: Transport.GRPC,
  options: {
    package: 'activity_service',
    protoPath: './proto/activity_service.proto',
  },
};