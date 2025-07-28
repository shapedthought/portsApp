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

## To Do

- Add alert on successful upload or if there is an error.
- Look at adding mermaid diagram output, this will require the in and out bound port remapping (see above) to be stored in the data service.
