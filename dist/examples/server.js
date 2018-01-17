"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const express = require("express");
const app = express();
app.get('/thumbnailer', function (req, res) {
    __1.default.renderUrl(req.query.url, [
        {
            width: 1920,
            height: 1200,
        }
    ])
        .then((thumbnailPngStreams) => {
        // thumbnails is an array (in matching order to your requests) of WebGlRenderTarget objects
        // you can write them to disk, return them to web users, etc
        res.setHeader('Content-Type', 'image/png');
        thumbnailPngStreams[0].pipe(res);
    })
        .catch(function (err) {
        res.status(500);
        res.send("Error thumbnailing: " + err);
        console.error(err);
    });
});
app.listen(3000, function () {
    console.log('Listening on port 3000\n');
});
//# sourceMappingURL=server.js.map