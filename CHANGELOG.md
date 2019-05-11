## lynn-cli

## 0.5.1

- Basic support for multipart and json body in requests

## 0.5.0

- [51] When running forEach, request no longer showing as undefined
- [50] Request name not duplicated on multiple requests
- [53] Matrix command working again
- [54] Non-interactive request command working again
- [55] Basic doc generation working again

## 0.4.0

- [38] Fixed crash on launch if requests folder not found## 0.3.0
- [30] Added version number to the launch banner
- [39] Created a getting started guide
- [43] Renamed `result` command to `response`
- [46] Environment replacement working in path now
- [18] Autocomplete works for request command
- [34] Added a forEach command

## 0.3.0

- Request format changed to use OpenAPI 3 spec files (NOTE: not all openAPI features supported yet)

## 0.2.1

- Updated to lynn version 0.3.0 for query string support

## 0.2.0

- [6] Added support for .lynnrc files and getting command line from environment
- [21] Fixed how flow queues up child requests
- [2] Added data type and expected values to schema docs
- [10] You can specify which environment parameters are required, and provide default values for both required and optional parameters
- [13] When specifying a request, flow, environment the .json extension is implied and will be added if not found
- [20] Added a new `config` command that shows the current config as set by command line and environment
- [22] Matrix output now includes the combination files that generated the request

## 0.1.1

- Updated to lynn 0.2.0 which changes capture behavior between array and non-array captures

## 0.1.0

- Initial release
