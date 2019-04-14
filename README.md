# lynn-cli

[![npm (scoped)](https://img.shields.io/npm/v/lynn-cli.svg)](https://www.npmjs.com/package/lynn-cli)
[![npm bundle size (minified)](https://img.shields.io/bundlephobia/min/lynn-cli.svg)](https://www.npmjs.com/package/lynn-cli)

Lynn-cli is a command line interface that utilizes the [lynn](https://github.com/davidahouse/lynn) module to perform network requests. It can execute the requests and generate documentation from the request definitions.

Lynn-cli works not just with single requests, but you can create entire flows that can be tested from a single invocation. This is helpful when you have a sequence of API calls that need to be made and the data from a parent call is used in child calls.

Api details are contained in a folder structure that can be managed in a source control system. All the request and flow details are simple json documents that are easily maintained in the editor of your choice.

## Install

```
npm install -g lynn-cli
```

## Usage

Interactive mode:

```
lynn-cli
```

Change the default working folder from ~/.lynn to a specific folder:

```
lynn-cli --workingFolder <path>
```

Set the project (aka subfolder) if your working folder contains multiple top level folders:

```
lynn-cli --project <project>
```

Add variables to the initial request environment (this can be a comma separated list of files). File paths are relative to the working folder + project and are located in the `environment` subfolder:

```
lynn-cli --environment <filename(s)>
```

Turn on auto saving of requests (output goes into the `log` subfolder of your current workingFolder + project directory):

```
lynn-cli --autoSave true
```

Execute a single request. Requests are found in the `requests` sub-folder and are json files that contain all the details related to executing and documenting the request.

```
lynn-cli --request <requestfile>
```

Execute a series of requests (aka flow). Flows are found in the `flows` sub-folder and are json files that describe which request to execute and how to execute additional reqests (perhaps with data collected from the initial request).

```
lynn-cli --flow <flowfile>
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

Show the current config as set by the command line parameters and environment:

```
lynn-cli> config
```

## Config

Any parameters that you specify on the command line are always used, but you can provide defaults for these parameters in the following ways:

### Common .lynnrc file 

For defaults that apply machine wide, you can create a default config file in one of the following locations:

```
$HOME/.lynnrc
$HOME/.lynn/config
$HOME/.config/lynn
$HOME/.config/lynn/config
/etc/lynnrc
/etc/lynn/config
```

Note that this is the order of importance so a file located in $HOME/.lynnrc will overwrite any default found in any of the other locations.

The config file should be a json file and has a basic structure that matches the possible command line parameters:

```
{
  "workingFolder": "",
  "environment": "",
  "autoSave": true,
  "project": ""
}
```

Note you only need to specify the parameters you want to provide defaults for in this file.

### A .lynnrc file in the folder you invoke lynn-cli from

Any .lynnrc file found in the current directory will also be used and will overwrite any defaults specified in your ~/.lynnrc file. The format of the file is the same.

Also the system will look in ../ and any parent folder up to the root for any .lynnrc file, but only the first one found will be used and considered a local config file (ie: it will overwrite any config found in the machine/user wide config files above).

### Environment variables

If you have environment variables for any of the parameters they will overwrite any defaults provided in the .lynnrc files above. Environment variables can be one of the following:

`lynn_workingFolder`
`lynn_environment`
`lynn_autoSave`
`lynn_project`


