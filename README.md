# PortsApp

This is the front-end project for the Ports App which is hosted on the Veeam Architects Site https://www.veeambp.com/

This is an Angular project so you will need to set up the environment:

https://angular.dev/installation

Then install the dependencies:

```
npm install
```

You can then serve the project via:

```
ng serve --open
```

NOTE: This has been modified to work behind NGNIX so you will need to modify the index.html for it to work locally.

FROM:
```
<head>
  <meta charset="utf-8">
  <title>PortsApp</title>
  <base href="/magic-ports/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
```

TO: 
```
<head>
  <meta charset="utf-8">
  <title>PortsApp</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
```
 
## Dockerfile

To create a container with the code use the supplied Dockerfile, then the usual build command.

```
docker build yourrepo/portsApp:0.1 .
```

Then run:

```
docker run --rm -d -p 80:80 pportsApp:0.1
```

## Backend API endpoint

Currently the http service uses hardlinks to the API endpoint, this may change in the future. That means you will need to change the address in:

./src/app/data.service.ts 

```
  // serverUrl = 'https://app.veeambp.com/ports_server'; << uncommment
  serverUrl = 'http://localhost:8001'; << comment
```

## Change Log

| Date | Version | Info |
| ---- | ------- | ---- |
| 191024 | 0.01  | First release |
| 231024 | 0.02  | <ul><li>Changed the layout to allow for better use of the screen</li></ul> <ul><li>Changed added validation to the add server modal.</li></ul> <ul><li>The target ports count is now working.</li></ul> <ul><li>Fixed bug on validation of server names in the mapping page. </li></ul>  <ul><li> Configs now persist on browser refresh. </li></ul> <ul><li> Added ability to save and load configuration </li></ul> <ul><li> Home screen ports display shows roll up of all ports for source and target by server. </li></ul> 

## To Do

- Add alert on successful upload or if there is an error.
- Look at adding mermaid diagram output, this will require the in and out bound port remapping (see aboeve) to be stored in the data service.