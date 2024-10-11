# PortsApp

This is the front-end project for the Ports App which is hosted on the Veeam Architectd Site https://www.veeambp.com/

This is an Angular project so you will need to download the NPM packages

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
  <base href="/ports_app/">
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

Currently the http service uses hardlinks to the API endpoint, this may change in the future.