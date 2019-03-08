# @davidahouse/lynn-cli

[![npm (scoped)](https://img.shields.io/npm/v/lynn-cli.svg)](https://www.npmjs.com/package/lynn-cli)
[![npm bundle size (minified)](https://img.shields.io/bundlephobia/min/lynn-cli.svg)](https://www.npmjs.com/package/lynn-cli)

Lynn-cli is a command line interface that utilizes the [lynn](https://github.com/davidahouse/lynn) module to perform network requests. It can execute the requests and generate documentation from the request definitions.

Lynn-cli works not just with single requests, but you can create entire flows that can be tested from a single invocation. This is helpful when you have a sequence of API calls that need to be made and the data from a parent call is used in child calls.

Api details are contained in a folder structure that can be managed in a source control system. All the request and flow details are simple json documents that are easily maintained in the editor of your choice.

## Install

```
npm install -g @davidahouse/lynn-cli
```

## Usage

Interactive mode:

```
lynn-cli -i
```

Change the default working folder from ~/.lynn to a specific folder:

```
lynn-cli -w <path>
```

Set the project (aka subfolder) if your working folder contains multiple top level folders:

```
lynn-cli -p <project>
```

Add variables to the initial request environment (this can be a comma separated list of files). File paths are relative to the working folder + project and are located in the `environment` subfolder:

```
lynn-cli -e <filename(s)>
```

Turn on auto saving of requests (output goes into the `log` subfolder of your current workingFolder + project directory):

```
lynn-cli -s
```

Execute a single request. Requests are found in the `requests` sub-folder and are json files that contain all the details related to executing and documenting the request.

```
lynn-cli -r <requestfile>
```

Execute a series of requests (aka flow). Flows are found in the `flows` sub-folder and are json files that describe which request to execute and how to execute additional reqests (perhaps with data collected from the initial request).

```
lynn-cli -f <flowfile>
```

## Interactive mode commands

Note: you can specify `workingFolder`, `project`, `autoSave` and `environment` from the command line when using interactive mode. All other parameters are ignored when using interactive mode (but are available inside the interactive mode itself).

Execute a request:

```
lynn-cli> request <request>
```

Repeat the last request again:

```
lynn-cli> request -l
```

Execute a flow (press control-c to return to the command prompt after the flow has finished):

```
lynn-cli> flow <flow>
```

Change the project:

```
lynn-cli> project <projectName>
```

Add details from an environment file (located in the lynn folder `environment` of the current project):

```
lynn-cli> environment <environmentName>
```

Reset the current environment and any previously executed requests:

```
lynn-cli> reset
```

View the results of the previous request. Key is optional and can contain one of the following vaules: [options, statusCode, headers, data, error, responseTime]:

```
lynn-cli> result [key]
```

Turn auto save on/off:

```
lynn-cli> autoSave <true/false>
```

Execute a jsonpath query inside the result data. See [jsonpath node library](https://github.com/dchester/jsonpath) for more details on allowed paths:

```
lynn-cli> query <jsonpath>
```

Display the contents of the current environment:

```
lynn-cli> environment
```

Set a variable into the current environment:

```
lynn-cli> set <variable> <value>
```

Generate markdown documentation for the API project. Note this creates a README.md in the root of the project folder, along with a /docs sub-folder.

```
lynn-cli> generate
```

List all the paths found in the result data:

```
lynn-cli> schema
```

List all the paths found in the result data in a format that can be copy/pasted into the request docs section:

```
lynn-cli> schema -d
```
