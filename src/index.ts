declare const global: any;

import fs from "fs";
import * as request from "request";
import * as THREE from "three";
import * as _ from "lodash";
import * as createContext from 'gl';
import {mocks} from 'mock-browser';
import * as pngStream from 'three-png-stream';

new mocks.MockBrowser();

global.document = mocks.MockBrowser.createDocument();
global.window = mocks.MockBrowser.createWindow();
global.THREE = THREE;

require("./threejs-extras/STLLoader.js");

export interface ThumbnailSpec {
  baseColor?: string;
  baseOpacity?: number;
  cameraAngle: number[];
  height: number;
  width: number;
}

export default class Thumbnailer {
  meshData: any;
  jobs: any[];

  constructor(requestThumbnails: Partial<ThumbnailSpec>[]) {
    this.jobs = _.map(requestThumbnails, thumb => this.validateThumbnailRequest(thumb));
  }

  static async renderFile(filePath: string, requestThumbnails: Partial<ThumbnailSpec>[]) {
    const thumbnailer = new Thumbnailer(requestThumbnails);
    await thumbnailer.loadFromFile(filePath)
    return await thumbnailer.processJobs();
  }

  static async renderUrl(url: string, requestThumbnails: Partial<ThumbnailSpec>[]) {
    const thumbnailer = new Thumbnailer(requestThumbnails);
    await thumbnailer.loadFromUrl(url);
    return await thumbnailer.processJobs();
  }

  setMeshData(meshData) {
    this.meshData = meshData;
  }

  async processJobs() {
    return await Promise.all(_.map(this.jobs, job => this.processThumbnail(job)));
  }

  loadFromUrl(url) {
    return new Promise((resolve, reject) => {
      request({
        url,
        encoding: null, // Required for binary STLs
        method: 'GET'
      }, (error, response, stlData) => {
        if (!error && response.statusCode == 200) {
          // STL Data is available!
          this.setMeshData(stlData);
          resolve(stlData);
        } else {
          if (error)
            reject(error);
          else
            reject(`Unable to retrieve ${url}`);
          }
        })
    });
  }

  loadFromFile(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (error, stlData) => {
        if (!error && stlData) {
          this.setMeshData(stlData);
          resolve(stlData);
        } else {
          if (error)
            reject(error);
          else
            reject(`Unable to load ${path}`);
          }
        });
    });
  }

  validateThumbnailRequest(thumbnail: ThumbnailSpec) {
    if (typeof thumbnail.width !== 'number')
      throw new Error('Please specify a thumbnail width');
    if (typeof thumbnail.height !== 'number')
      throw new Error('Please specify a thumbnail width');

    const defaults = this.getDefaults();
    return _.extend(_.clone(defaults), thumbnail);
  }

  getDefaults() {
    return {
      cameraAngle: [
        10, 50, 100
      ], // optional: specify the angle of the view for thumbnailing. This is the camera's position vector, the opposite of the direction the camera is looking.
      backgroundColor: 0xffffff, // optional: background color (RGB) for the rendered image
      baseOpacity: 0.7, // optional: translucency of the base material that lets you see through it
      baseColor: 0xffffff, // optional: base color
    };
  }

  async processThumbnail(thumbnailSpec: ThumbnailSpec) {
    // Prepare the scene, renderer, and camera
    const {width, height} = thumbnailSpec;
    const gl = createContext(width, height, {preserveDrawingBuffer: false});
    const renderer = new THREE.WebGLRenderer({context: gl, antialias: true});

    // TODO: make default scene configurable
    const json = require('../scenes/default.json');
    const project = json.project;

    if ( project.gammaInput ) renderer.gammaInput = true;
    if ( project.gammaOutput ) renderer.gammaOutput = true;
    if ( project.shadows ) renderer.shadowMap.enabled = true;

    const loader = new THREE.ObjectLoader();
    const scene = loader.parse(json.scene);
    const camera = loader.parse(json.camera);
    const geometry = this.getGeometry();

    // replace object named "part"
    const partObj = scene.getObjectByName('part');
    if (partObj) {
      partObj.geometry = geometry;
    } else {
      console.error('no object named "part" found in scene');
    }

    // Configure renderer
    renderer.setSize(width, height, false)
    renderer.setClearColor(0xffffff, 0);

    // Configure camera with user-set position, then move it in-or-out depending on
    // the size of the model that needs to display
    camera.position.x = thumbnailSpec.cameraAngle[0];
    camera.position.y = thumbnailSpec.cameraAngle[1];
    camera.position.z = thumbnailSpec.cameraAngle[2];
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // (re)Position the camera See
    // http://stackoverflow.com/questions/14614252/how-to-fit-camera-to-object
    const fov = camera.fov * (Math.PI / 180);
    const distance = Math.abs(geometry.boundingSphere.radius / Math.sin(fov / 2));
    const newPosition = camera
      .position
      .clone()
      .normalize()
      .multiplyScalar(distance);
    camera
      .position
      .set(newPosition.x, newPosition.y, newPosition.z);
    camera.needsUpdate = true;
    camera.updateProjectionMatrix();


    const target = new THREE.WebGLRenderTarget(width, height);
    renderer.render(scene, camera, target);
    return pngStream(renderer, target);
  }

  getGeometry() {
    const loader = new THREE.STLLoader();
    const geometry = loader.parse(this.meshData);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    geometry.center();
    return geometry;
  }
}
