# -*- coding: utf-8 -*-
# Generated by the protocol buffer compiler.  DO NOT EDIT!
# NO CHECKED-IN PROTOBUF GENCODE
# source: activity_service.proto
# Protobuf Python Version: 5.27.2
"""Generated protocol buffer code."""
from google.protobuf import descriptor as _descriptor
from google.protobuf import descriptor_pool as _descriptor_pool
from google.protobuf import runtime_version as _runtime_version
from google.protobuf import symbol_database as _symbol_database
from google.protobuf.internal import builder as _builder
_runtime_version.ValidateProtobufRuntimeVersion(
    _runtime_version.Domain.PUBLIC,
    5,
    27,
    2,
    '',
    'activity_service.proto'
)
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor_pool.Default().AddSerializedFile(b'\n\x16\x61\x63tivity_service.proto\x12\x10\x61\x63tivity_service\"!\n\x0eWorkoutRequest\x12\x0f\n\x07user_id\x18\x01 \x01(\t\"$\n\x0eSessionRequest\x12\x12\n\nsession_id\x18\x01 \x01(\t\"9\n\x0fWorkoutResponse\x12\x12\n\nsession_id\x18\x01 \x01(\t\x12\x12\n\nstart_time\x18\x02 \x01(\t\"Z\n\x0bVoteRequest\x12\x12\n\nsession_id\x18\x01 \x01(\t\x12\x0f\n\x07user_id\x18\x02 \x01(\t\x12\x14\n\x0cworkout_type\x18\x03 \x01(\t\x12\x10\n\x08\x64uration\x18\x04 \x01(\x05\"\x1f\n\x0cVoteResponse\x12\x0f\n\x07message\x18\x01 \x01(\t\"<\n\x12\x43ountVotesResponse\x12\x14\n\x0cworkout_type\x18\x01 \x01(\t\x12\x10\n\x08\x64uration\x18\x02 \x01(\x05\x32\xeb\x02\n\x0f\x41\x63tivityService\x12Z\n\x13StartWorkoutSession\x12 .activity_service.WorkoutRequest\x1a!.activity_service.WorkoutResponse\x12X\n\x11\x45ndWorkoutSession\x12 .activity_service.SessionRequest\x1a!.activity_service.WorkoutResponse\x12L\n\x0bVoteWorkout\x12\x1d.activity_service.VoteRequest\x1a\x1e.activity_service.VoteResponse\x12T\n\nCountVotes\x12 .activity_service.SessionRequest\x1a$.activity_service.CountVotesResponseb\x06proto3')

_globals = globals()
_builder.BuildMessageAndEnumDescriptors(DESCRIPTOR, _globals)
_builder.BuildTopDescriptorsAndMessages(DESCRIPTOR, 'activity_service_pb2', _globals)
if not _descriptor._USE_C_DESCRIPTORS:
  DESCRIPTOR._loaded_options = None
  _globals['_WORKOUTREQUEST']._serialized_start=44
  _globals['_WORKOUTREQUEST']._serialized_end=77
  _globals['_SESSIONREQUEST']._serialized_start=79
  _globals['_SESSIONREQUEST']._serialized_end=115
  _globals['_WORKOUTRESPONSE']._serialized_start=117
  _globals['_WORKOUTRESPONSE']._serialized_end=174
  _globals['_VOTEREQUEST']._serialized_start=176
  _globals['_VOTEREQUEST']._serialized_end=266
  _globals['_VOTERESPONSE']._serialized_start=268
  _globals['_VOTERESPONSE']._serialized_end=299
  _globals['_COUNTVOTESRESPONSE']._serialized_start=301
  _globals['_COUNTVOTESRESPONSE']._serialized_end=361
  _globals['_ACTIVITYSERVICE']._serialized_start=364
  _globals['_ACTIVITYSERVICE']._serialized_end=727
# @@protoc_insertion_point(module_scope)
