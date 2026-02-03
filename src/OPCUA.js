(function (root) {
    "use strict";
    const OPCUA = {};
    const isNodeJS = typeof require === 'function';
    const { OPCUAClient, DataType, AttributeIds, resolveNodeId } = require('node-opcua-client');
    const Executor = require('@markus.hardardt/js_utils/src/Executor.js');
    const Core = require('@markus.hardardt/js_utils/src/Core.js');

    function getAsCoreDataType(type) {
        switch (type) {
            case DataType.Null:
                return Core.DataType.Null;
            case DataType.Boolean:
                return Core.DataType.Boolean;
            case DataType.SByte:
                return Core.DataType.Int8;
            case DataType.Byte:
                return Core.DataType.UInt8;
            case DataType.Int16:
                return Core.DataType.Int16;
            case DataType.UInt16:
                return Core.DataType.UInt16;
            case DataType.Int32:
                return Core.DataType.Int32;
            case DataType.UInt32:
                return Core.DataType.UInt32;
            case DataType.Int64:
                return Core.DataType.Int64;
            case DataType.UInt64:
                return Core.DataType.UInt64;
            case DataType.Float:
                return Core.DataType.Float;
            case DataType.Double:
                return Core.DataType.Double;
            case DataType.String:
                return Core.DataType.String;
            case DataType.DateTime:
            case DataType.Guid:
            case DataType.ByteString:
            case DataType.XmlElement:
            case DataType.NodeId:
            case DataType.ExpandedNodeId:
            case DataType.StatusCode:
            case DataType.QualifiedName:
            case DataType.LocalizedText:
            case DataType.ExtensionObject:
            case DataType.DataValue:
            case DataType.Variant:
            case DataType.DiagnosticInfo:
            default:
                return Core.DataType.Unknown;
        }
    }
    OPCUA.getAsCoreDataType = getAsCoreDataType;

    function getAccessString(namespace, nodeId) {
        return `ns=${namespace};s=${nodeId}`;
    }

    async function startOpcuaClient(client, endpointUrl, namespace, nodeIds, nodes) {
        try {
            console.log(`Connecting OPC UC client to endpointUrl: ${endpointUrl}`);
            await client.connect(endpointUrl);

            const session = await client.createSession();
            console.log('Successfully connected!');

            for (const id of nodeIds) {
                try {
                    const nodeId = resolveNodeId(getAccessString(namespace, id));
                    const dataValue = await session.read({ nodeId, attributeId: AttributeIds.Value });
                    if (dataValue.statusCode.name === 'Good') {
                        nodes[id] = { nodeId, value: dataValue.value.value, type: dataValue.value.dataType };
                    } else {
                        console.error(`❌  NodeId ${id} exists, but status: ${dataValue.statusCode.name}`);
                    }
                } catch (err) {
                    console.error(`❌ NodeId ${id} could not be read:`, err.message);
                }
            }
            return session;
        } catch (error) {
            console.error(`Failed starting OPC UC client: ${error.message}`);
        }
    }

    async function stopOpcuaClient(session, client) {
        try {
            console.log('cleaning up ...');
            await session.close();
            await client.disconnect();
            console.log('cleanup done');
        } catch (error) {
            console.error(`Failed stopping OPC UC client: ${error.message}`);
        }
    }

    class Client {
        constructor(endpointUrl, namespace, nodesConfig) {
            this._endpointUrl = endpointUrl;
            this._namespace = namespace;
            this._nodeIds = nodesConfig;
            this._nodes = {};
            this._client = OPCUAClient.create({ endpointMustExist: true });
            this._session = null;
        }

        get type() {
            return 'task';
        }

        Initialize(onSuccess, onError) {
            const tasks = [];
            tasks.push((onSuc, onErr) => startOpcuaClient(this._client, this._endpointUrl, this._namespace, this._nodeIds, this._nodes).then(session => {
                this._session = session;
                onSuc();
            }).catch(onErr));
            Executor.run(tasks, () => {
                console.log(`Nodes: ${JSON.stringify(this._nodes, undefined, 2)}`);
                onSuccess();
            }, error => {
                onError(error);
            })
        }

        Shutdown(onSuccess, onError) {
            if (this._session) {
                stopOpcuaClient(this._session, this._client).then(onSuccess);
            } else {
                onError('Session not started');
            }
        }

        GetType(dataId) {
            // TODO
        }

        SubscribeData(dataId, onRefresh) {
            // TODO
        }

        UnsubscribeData(dataId, onRefresh) {
            // TODO
        }

        Read(dataId, onResponse, onError) {
            // TODO
        }

        Write(dataId, value) {
            // TODO
        }

        GetDataPoints() {
            // TODO
        }
    }
    OPCUA.Client = Client;

    const TODO = { // TODO: Remove when implemented
        type: "task",
        targetId: "",
        dataPoints: {},
        GetType: function (dataId) {
            const dp = this._dataPoints[dataId];
            return dp ? dp.type : Core.DataType.Unknown;
        },
        SubscribeData: function (dataId, onRefresh) {
            const dp = this._dataPoints[dataId];
            if (dp) {
                dp.onRefresh = onRefresh;
            }
        },
        UnsubscribeData: function (dataId, onRefresh) {
            const dp = this._dataPoints[dataId];
            if (dp) {
                dp.onRefresh = null;
            }
        },
        Read: function (dataId, onResponse, onError) {
            const dp = this._dataPoints[dataId];
            if (dp) {
                onResponse(dp.value);
            } else {
                onError(`Not supported: '${dataId}'`);
            }
        },
        Write: function (dataId, value) {
            const dp = this._dataPoints[dataId];
            if (dp) {
                dp.value = value;
                if (dp.onResponse) {
                    dp.onResponse(value);
                }
            }
        },
        GetDataPoints: function () {
            const dps = [];
            for (const id in this.dataPoints) {
                if (this.dataPoints.hasOwnProperty(id)) {
                    const type = this.dataPoints[id];
                    dps.push({
                        id,
                        type: Core.DataType[type]
                    });
                }
            }
            return dps;
        },
        _getRandomValue: "include:$Core/Simulation/getRandomValue.j",
        build: (that, onSuccess, onError) => {
            that._dataPoints = {};
            for (const id in that.dataPoints) {
                if (that.dataPoints.hasOwnProperty(id)) {
                    const type = Core.DataType[that.dataPoints[id]];
                    that._dataPoints[id] = {
                        type,
                        value: that._getRandomValue(type),
                        onRefresh: null
                    }
                }
            }
            onSuccess();
        },
        prepare: (that, onSuccess, onError) => {
            try {
                that.hmi.env.router.RegisterDataAccesObject(that.targetId, that);
                onSuccess()
            } catch (error) {
                onError(error);
            }
        },
        destroy: (that, onSuccess, onError) => {
            try {
                that.hmi.env.router.UnregisterDataAccesObject(that.targetId, that);
                onSuccess()
            } catch (error) {
                onError(error);
            }
        },
        _time: 0,
        refresh: function (that, date) {
            const time = date.getTime();
            if (time > that._time + 500) {
                that._time = time;
                for (const id in that._dataPoints) {
                    if (that._dataPoints.hasOwnProperty(id)) {
                        const dp = that._dataPoints[id];
                        dp.value = that._getRandomValue(dp.type);
                        if (dp.onRefresh) {
                            dp.onRefresh(dp.value);
                        }
                    }
                }
            }
        }
    };

    Object.freeze(OPCUA);
    if (isNodeJS) {
        module.exports = OPCUA;
    } else {
        root.Template = OPCUA;
    }
}(globalThis));
