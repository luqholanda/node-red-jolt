const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs");
const os = require("os");
const tempDir = os.tmpdir();

var inputFile = `${tempDir}/input.json`;
var specFile = `${tempDir}/spec.json`;
var jarFile = `${__dirname}/bin/jolt-cli-0.1.6-SNAPSHOT.jar`;

async function execJar() {
    return await exec(`java -jar ${jarFile} transform ${specFile} ${inputFile}`)
        .then(stdout => stdout.stdout)
        .catch(error => error);
}

async function getJarResult() {
    var resultado = await execJar();
    return resultado;
}

module.exports = function (RED) {
    function Jolt(config) {
        RED.nodes.createNode(this, config);

        this.joltEditor = config.joltEditor;

        let node = this;
        node.on("input", function (msg) {
            var payloadJson = msg[config.jsonvar];

            if (typeof payloadJson != "string") {
                payloadJson = JSON.stringify(payloadJson);
            }

            try {
                JSON.parse(payloadJson);
            } catch (e) {
                msg.error = createErrorMessage(config, "Your payload isn't a Json Object");
                node.send(msg);
                return;
            }

            fs.writeFileSync(inputFile, payloadJson);
            fs.writeFileSync(specFile, config.joltEditor);

            Promise.resolve(getJarResult()).then(function (value) {
                
                try {
                    
                    if (value.stdout != null && value.stdout.indexOf("RuntimeException") >= 0) {
                        throw value.stdout;
                    }

                    msg.payload = JSON.parse(value);
                } catch (e) {
                    msg.error = createErrorMessage(config, e);
                    node.send(msg);
                }

                node.send(msg);
            }, function (value) {
                msg.status = createErrorMessage(config, value);
                node.send(msg);
            });
        });
    }

    function createErrorMessage(config, message) {
        return error = {
            "message": message,
            "source": {
                "id": config.id,
                "type": "function",
                "name": "Jolt",
            }
        };
    }

    RED.nodes.registerType("jolt", Jolt);
}