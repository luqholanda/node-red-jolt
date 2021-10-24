const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

var inputFile = '/home/lucas/.node-red/node_modules/node-red-jolt/bin/input.json';
var specFile = '/home/lucas/.node-red/node_modules/node-red-jolt/bin/spec.json';

async function execJar() {
    return await exec('java -jar /home/lucas/.node-red/node_modules/node-red-jolt/bin/jolt-cli-0.1.6-SNAPSHOT.jar transform ' + specFile + ' ' + inputFile)
        .then(stdout => stdout.stdout)
        .catch(error => error);
}

async function getJarResult() {
    var resultado = await execJar();
    return resultado;
}

module.exports = function(RED) {
    function Jolt(config) {
        RED.nodes.createNode(this, config);

        this.joltEditor = config.joltEditor;

        let node = this;
        node.on('input', function(msg) {
            var payloadJson = msg[config.jsonvar];

            if (typeof payloadJson != 'string') {
                payloadJson = JSON.stringify(payloadJson);
            }

            try {
                JSON.parse(payloadJson);
            } catch (e) {

                var error = {
                    "message": "Your payload isn't a Json Object",
                    "source": {
                        "id": config._msgid,
                        "type": "function",
                        "name": "Jolt",
                    }
                };

                msg.error = error;
                node.send(msg);
                return ;
            }

            fs.writeFileSync(inputFile, payloadJson);
            fs.writeFileSync(specFile, config.joltEditor);

            Promise.resolve(getJarResult()).then(function (value)
            {
                msg.payload = JSON.parse(value);
                node.send(msg);
            }, function (value)
            {
                console.log(value);
            });
        });
    }
    
    RED.nodes.registerType("jolt", Jolt);
}