"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const request = require("request");
const THREE = require("three");
const _ = require("lodash");
const createContext = require("gl");
const mock_browser_1 = require("mock-browser");
const pngStream = require("three-png-stream");
new mock_browser_1.mocks.MockBrowser();
global.document = mock_browser_1.mocks.MockBrowser.createDocument();
global.window = mock_browser_1.mocks.MockBrowser.createWindow();
global.THREE = THREE;
require("./threejs-extras/STLLoader.js");
class Thumbnailer {
    constructor(requestThumbnails) {
        this.jobs = _.map(requestThumbnails, thumb => this.validateThumbnailRequest(thumb));
    }
    static renderFile(filePath, requestThumbnails) {
        return __awaiter(this, void 0, void 0, function* () {
            const thumbnailer = new Thumbnailer(requestThumbnails);
            yield thumbnailer.loadFromFile(filePath);
            return yield thumbnailer.processJobs();
        });
    }
    static renderUrl(url, requestThumbnails) {
        return __awaiter(this, void 0, void 0, function* () {
            const thumbnailer = new Thumbnailer(requestThumbnails);
            yield thumbnailer.loadFromUrl(url);
            return yield thumbnailer.processJobs();
        });
    }
    setMeshData(meshData) {
        this.meshData = meshData;
    }
    processJobs() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Promise.all(_.map(this.jobs, job => this.processThumbnail(job)));
        });
    }
    loadFromUrl(url) {
        return new Promise((resolve, reject) => {
            request({
                url,
                encoding: null,
                method: 'GET'
            }, (error, response, stlData) => {
                if (!error && response.statusCode == 200) {
                    // STL Data is available!
                    this.setMeshData(stlData);
                    resolve(stlData);
                }
                else {
                    if (error)
                        reject(error);
                    else
                        reject(`Unable to retrieve ${url}`);
                }
            });
        });
    }
    loadFromFile(path) {
        return new Promise((resolve, reject) => {
            fs_1.default.readFile(path, (error, stlData) => {
                if (!error && stlData) {
                    this.setMeshData(stlData);
                    resolve(stlData);
                }
                else {
                    if (error)
                        reject(error);
                    else
                        reject(`Unable to load ${path}`);
                }
            });
        });
    }
    validateThumbnailRequest(thumbnail) {
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
            ],
            backgroundColor: 0xffffff,
            baseOpacity: 0.7,
            baseColor: 0xffffff,
        };
    }
    processThumbnail(thumbnailSpec) {
        return __awaiter(this, void 0, void 0, function* () {
            // Prepare the scene, renderer, and camera
            const { width, height } = thumbnailSpec;
            const gl = createContext(width, height, { preserveDrawingBuffer: false });
            const renderer = new THREE.WebGLRenderer({ context: gl, antialias: true });
            // TODO: make default scene configurable
            const json = require('../scenes/default.json');
            const project = json.project;
            if (project.gammaInput)
                renderer.gammaInput = true;
            if (project.gammaOutput)
                renderer.gammaOutput = true;
            if (project.shadows)
                renderer.shadowMap.enabled = true;
            const loader = new THREE.ObjectLoader();
            const scene = loader.parse(json.scene);
            const camera = loader.parse(json.camera);
            const geometry = this.getGeometry();
            // replace object named "part"
            const partObj = scene.getObjectByName('part');
            if (partObj) {
                partObj.geometry = geometry;
            }
            else {
                console.error('no object named "part" found in scene');
            }
            // Configure renderer
            renderer.setSize(width, height, false);
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
        });
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
exports.default = Thumbnailer;
//# sourceMappingURL=index.js.map