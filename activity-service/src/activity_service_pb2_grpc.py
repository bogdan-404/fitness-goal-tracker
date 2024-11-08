# Generated by the gRPC Python protocol compiler plugin. DO NOT EDIT!
"""Client and server classes corresponding to protobuf-defined services."""
import grpc
import warnings

import activity_service_pb2 as activity__service__pb2

GRPC_GENERATED_VERSION = '1.66.1'
GRPC_VERSION = grpc.__version__
_version_not_supported = False

try:
    from grpc._utilities import first_version_is_lower
    _version_not_supported = first_version_is_lower(GRPC_VERSION, GRPC_GENERATED_VERSION)
except ImportError:
    _version_not_supported = True

if _version_not_supported:
    raise RuntimeError(
        f'The grpc package installed is at version {GRPC_VERSION},'
        + f' but the generated code in activity_service_pb2_grpc.py depends on'
        + f' grpcio>={GRPC_GENERATED_VERSION}.'
        + f' Please upgrade your grpc module to grpcio>={GRPC_GENERATED_VERSION}'
        + f' or downgrade your generated code using grpcio-tools<={GRPC_VERSION}.'
    )


class ActivityServiceStub(object):
    """Missing associated documentation comment in .proto file."""

    def __init__(self, channel):
        """Constructor.

        Args:
            channel: A grpc.Channel.
        """
        self.StartWorkoutSession = channel.unary_unary(
                '/activity_service.ActivityService/StartWorkoutSession',
                request_serializer=activity__service__pb2.WorkoutRequest.SerializeToString,
                response_deserializer=activity__service__pb2.WorkoutResponse.FromString,
                _registered_method=True)
        self.StartGroupWorkoutSession = channel.unary_unary(
                '/activity_service.ActivityService/StartGroupWorkoutSession',
                request_serializer=activity__service__pb2.WorkoutRequest.SerializeToString,
                response_deserializer=activity__service__pb2.WorkoutResponse.FromString,
                _registered_method=True)
        self.EndWorkoutSession = channel.unary_unary(
                '/activity_service.ActivityService/EndWorkoutSession',
                request_serializer=activity__service__pb2.SessionRequest.SerializeToString,
                response_deserializer=activity__service__pb2.WorkoutResponse.FromString,
                _registered_method=True)
        self.VoteWorkout = channel.unary_unary(
                '/activity_service.ActivityService/VoteWorkout',
                request_serializer=activity__service__pb2.VoteRequest.SerializeToString,
                response_deserializer=activity__service__pb2.VoteResponse.FromString,
                _registered_method=True)
        self.CountVotes = channel.unary_unary(
                '/activity_service.ActivityService/CountVotes',
                request_serializer=activity__service__pb2.SessionRequest.SerializeToString,
                response_deserializer=activity__service__pb2.CountVotesResponse.FromString,
                _registered_method=True)


class ActivityServiceServicer(object):
    """Missing associated documentation comment in .proto file."""

    def StartWorkoutSession(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

    def StartGroupWorkoutSession(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

    def EndWorkoutSession(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

    def VoteWorkout(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

    def CountVotes(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')


def add_ActivityServiceServicer_to_server(servicer, server):
    rpc_method_handlers = {
            'StartWorkoutSession': grpc.unary_unary_rpc_method_handler(
                    servicer.StartWorkoutSession,
                    request_deserializer=activity__service__pb2.WorkoutRequest.FromString,
                    response_serializer=activity__service__pb2.WorkoutResponse.SerializeToString,
            ),
            'StartGroupWorkoutSession': grpc.unary_unary_rpc_method_handler(
                    servicer.StartGroupWorkoutSession,
                    request_deserializer=activity__service__pb2.WorkoutRequest.FromString,
                    response_serializer=activity__service__pb2.WorkoutResponse.SerializeToString,
            ),
            'EndWorkoutSession': grpc.unary_unary_rpc_method_handler(
                    servicer.EndWorkoutSession,
                    request_deserializer=activity__service__pb2.SessionRequest.FromString,
                    response_serializer=activity__service__pb2.WorkoutResponse.SerializeToString,
            ),
            'VoteWorkout': grpc.unary_unary_rpc_method_handler(
                    servicer.VoteWorkout,
                    request_deserializer=activity__service__pb2.VoteRequest.FromString,
                    response_serializer=activity__service__pb2.VoteResponse.SerializeToString,
            ),
            'CountVotes': grpc.unary_unary_rpc_method_handler(
                    servicer.CountVotes,
                    request_deserializer=activity__service__pb2.SessionRequest.FromString,
                    response_serializer=activity__service__pb2.CountVotesResponse.SerializeToString,
            ),
    }
    generic_handler = grpc.method_handlers_generic_handler(
            'activity_service.ActivityService', rpc_method_handlers)
    server.add_generic_rpc_handlers((generic_handler,))
    server.add_registered_method_handlers('activity_service.ActivityService', rpc_method_handlers)


 # This class is part of an EXPERIMENTAL API.
class ActivityService(object):
    """Missing associated documentation comment in .proto file."""

    @staticmethod
    def StartWorkoutSession(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_unary(
            request,
            target,
            '/activity_service.ActivityService/StartWorkoutSession',
            activity__service__pb2.WorkoutRequest.SerializeToString,
            activity__service__pb2.WorkoutResponse.FromString,
            options,
            channel_credentials,
            insecure,
            call_credentials,
            compression,
            wait_for_ready,
            timeout,
            metadata,
            _registered_method=True)

    @staticmethod
    def StartGroupWorkoutSession(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_unary(
            request,
            target,
            '/activity_service.ActivityService/StartGroupWorkoutSession',
            activity__service__pb2.WorkoutRequest.SerializeToString,
            activity__service__pb2.WorkoutResponse.FromString,
            options,
            channel_credentials,
            insecure,
            call_credentials,
            compression,
            wait_for_ready,
            timeout,
            metadata,
            _registered_method=True)

    @staticmethod
    def EndWorkoutSession(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_unary(
            request,
            target,
            '/activity_service.ActivityService/EndWorkoutSession',
            activity__service__pb2.SessionRequest.SerializeToString,
            activity__service__pb2.WorkoutResponse.FromString,
            options,
            channel_credentials,
            insecure,
            call_credentials,
            compression,
            wait_for_ready,
            timeout,
            metadata,
            _registered_method=True)

    @staticmethod
    def VoteWorkout(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_unary(
            request,
            target,
            '/activity_service.ActivityService/VoteWorkout',
            activity__service__pb2.VoteRequest.SerializeToString,
            activity__service__pb2.VoteResponse.FromString,
            options,
            channel_credentials,
            insecure,
            call_credentials,
            compression,
            wait_for_ready,
            timeout,
            metadata,
            _registered_method=True)

    @staticmethod
    def CountVotes(request,
            target,
            options=(),
            channel_credentials=None,
            call_credentials=None,
            insecure=False,
            compression=None,
            wait_for_ready=None,
            timeout=None,
            metadata=None):
        return grpc.experimental.unary_unary(
            request,
            target,
            '/activity_service.ActivityService/CountVotes',
            activity__service__pb2.SessionRequest.SerializeToString,
            activity__service__pb2.CountVotesResponse.FromString,
            options,
            channel_credentials,
            insecure,
            call_credentials,
            compression,
            wait_for_ready,
            timeout,
            metadata,
            _registered_method=True)
