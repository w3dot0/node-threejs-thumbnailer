### node-threejs-thumbnailer

ThreeJS Thumbnail Renderer for STL files. Inspired by https://github.com/Instructables/node-stl-thumbnailer

- Uses headless webgl to render thumbnails on server.

## Installation
```
npm install .
```
see https://github.com/stackgl/headless-gl for dependencies

TODO - publish npm module

## Usage
```
npm run example-server
```

view http://localhost:3000/thumbnailer?url=https://cdn.thingiverse.com/assets/1e/79/fe/09/16/eagle2.stl


## Scene creation
You can use https://threejs.org/editor/ to create a default scene (camera, lighting, material):
- create a placeholder mesh (e.g. cube) and name it "part"
- publish the scene
- extract zip file
- copy app.json to ./scenes/default.json


