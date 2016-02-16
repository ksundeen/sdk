/*
 * Copyright 2015-present Boundless Spatial Inc., http://boundlessgeo.com
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import ol from 'openlayers';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import LayerConstants from '../constants/LayerConstants.js';
import AppDispatcher from '../dispatchers/AppDispatcher.js';
import LayerSelector from './LayerSelector.jsx';
import LayerStore from '../stores/LayerStore.js';
import MapTool from './MapTool.js';
import Pui from 'pui-react-alerts';
import UI from 'pui-react-buttons';
import pureRender from 'pure-render-decorator';
import './WFST.css';

const messages = defineMessages({
  layerlabel: {
    id: 'wfst.layerlabel',
    description: 'Label for the layer combo box',
    defaultMessage: 'Layer'
  },
  drawfeature: {
    id: 'wfst.drawfeature',
    description: 'Button text for draw new feature',
    defaultMessage: 'Draw'
  },
  modifyfeature: {
    id: 'wfst.modifyfeature',
    description: 'Button text for modify / select existing feature',
    defaultMessage: 'Modify / Select'
  },
  deletefeature: {
    id: 'wfst.deletefeature',
    description: 'Button text for delete selected feature',
    defaultMessage: 'Delete'
  },
  errormsg: {
    id: 'wfst.errormsg',
    description: 'Error message to show the user when a request fails',
    defaultMessage: 'Error saving this feature to GeoServer. {msg}'
  },
  deletemsg: {
    id: 'wfst.deletemsg',
    description: 'Error message to show when delete fails',
    defaultMessage: 'There was an issue deleting the feature.'
  }
});

/**
 * Allows users to make changes to WFS-T layers. This can be drawing new
 * features and deleting or modifying existing features. Only geometry
 * changes are currently supported, no attribute changes.
 * This depends on ol.layer.Vector with ol.source.Vector. The layer
 * needs to have isWFST set to true. Also a wfsInfo object needs to be
 * configured on the layer with the following properties:
 * - featureNS: the namespace of the WFS typename
 * - featureType: the name (without prefix) of the underlying WFS typename
 * - geometryType: the type of geometry (e.g. MultiPolygon)
 * - geometryName: the name of the geometry attribute
 * - url: the online resource of the WFS endpoint
 */
@pureRender
class WFST extends MapTool {
  constructor(props) {
    super(props);
    var me = this;
    AppDispatcher.register((payload) => {
      let action = payload.action;
      switch (action.type) {
        case LayerConstants.SELECT_LAYER:
          if (action.cmp === me.refs.layerSelector) {
            me._setLayer(action.layer);
          }
          break;
        default:
          break;
      }
    });
    this.state = {
      error: false
    };
    this._interactions = {};
    this._select = new ol.interaction.Select();
    var features = this._select.getFeatures();
    this._modify = new ol.interaction.Modify({
      features: features
    });
    features.on('add', this._onSelectAdd, this);
    features.on('remove', this._onSelectRemove, this);
    this._dirty = {};
    this._format = new ol.format.WFS();
    this._serializer = new XMLSerializer();
  }
  componentDidMount() {
    if (!this.props.layer) {
      var layerId = ReactDOM.findDOMNode(this.refs.layerSelector).value;
      this._setLayer(LayerStore.findLayer(layerId));
    }
  }
  componentWillUnmount() {
    this.deactivate();
  }
  _setError(msg) {
    this.setState({
      error: true,
      msg: msg
    });
  }
  _setLayer(layer) {
    this._layer = layer;
    this.props.map.getView().fit(
      this._layer.getSource().getExtent(),
      this.props.map.getSize()
    );
  }
  _modifyFeature() {
    this.deactivate();
    this.activate([this._select, this._modify]);
  }
  _deleteFeature() {
    var wfsInfo = this._layer.get('wfsInfo');
    const {formatMessage} = this.props.intl;
    var features = this._select.getFeatures();
    if (features.getLength() === 1) {
      var feature = features.item(0);
      var node = this._format.writeTransaction(null, null, [feature], {
        featureNS: wfsInfo.featureNS,
        featureType: wfsInfo.featureType
      });
      this._doPOST(this._serializer.serializeToString(node),
        function(xmlhttp) {
          var data = xmlhttp.responseText;
          var result = this._readResponse(data);
          if (result && result.transactionSummary.totalDeleted === 1) {
            this._select.getFeatures().clear();
            this._layer.getSource().removeFeature(feature);
          } else {
            this._setError(formatMessage(messages.deletemsg));
          }
        },
        function(xmlhttp) {
          this._setError(xmlhttp.status + ' ' + xmlhttp.statusText);
        },
        this
      );
    }
  }
  _onSubmit(evt) {
    evt.preventDefault();
  }
  _filterLayerList(lyr) {
    return lyr.get('isWFST');
  }
  _onSelectAdd(evt) {
    var feature = evt.element;
    feature.on('change', function(evt) {
      this._dirty[evt.target.getId()] = true;
    }, this);
  }
  _onSelectRemove(evt) {
    var feature = evt.element;
    var wfsInfo = this._layer.get('wfsInfo');
    var fid = feature.getId();
    if (this._dirty[fid]) {
      var featureGeometryName = feature.getGeometryName();
      // do a WFS transaction to update the geometry
      var properties = feature.getProperties();
      // get rid of bbox which is not a real property
      delete properties.bbox;
      if (wfsInfo.geometryName !== featureGeometryName) {
        properties[wfsInfo.geometryName] = properties[featureGeometryName];
        delete properties[featureGeometryName];
      }
      var clone = new ol.Feature(properties);
      clone.setId(fid);
      if (wfsInfo.geometryName !== featureGeometryName) {
        clone.setGeometryName(wfsInfo.geometryName);
      }
      var node = this._format.writeTransaction(null, [clone], null, {
        gmlOptions: {
          srsName: this.props.map.getView().getProjection().getCode()
        },
        featureNS: wfsInfo.featureNS,
        featureType: wfsInfo.featureType
      });
      this._doPOST(this._serializer.serializeToString(node),
        function(xmlhttp) {
          var data = xmlhttp.responseText;
          var result = this._readResponse(data);
          if (result && result.transactionSummary.totalUpdated === 1) {
            delete this._dirty[fid];
          }
        },
        function(xmlhttp) {
          this._setError(xmlhttp.status + ' ' + xmlhttp.statusText);
        },
        this
      );
    }
  }
  _doPOST(data, success, failure, scope) {
    var xmlhttp = new XMLHttpRequest();
    var url = this._layer.get('wfsInfo').url;
    xmlhttp.open('POST', url, true);
    xmlhttp.setRequestHeader('Content-Type', 'text/xml');
    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState === 4) {
        if (xmlhttp.status === 200) {
          success.call(scope, xmlhttp);
        } else {
          failure.call(scope, xmlhttp);
        }
      }
    };
    xmlhttp.send(data);
  }
  _readResponse(data) {
    var result;
    if (global.Document && data instanceof global.Document && data.documentElement &&
      data.documentElement.localName == 'ExceptionReport') {
      this._setError(data.getElementsByTagNameNS('http://www.opengis.net/ows', 'ExceptionText').item(0).textContent);
    } else {
      result = this._format.readTransactionResponse(data);
    }
    return result;
  }
  _onDrawEnd(evt) {
    var wfsInfo = this._layer.get('wfsInfo');
    var feature = evt.feature;
    var node = this._format.writeTransaction([feature], null, null, {
      gmlOptions: {
        srsName: this.props.map.getView().getProjection().getCode()
      },
      featureNS: wfsInfo.featureNS,
      featureType: wfsInfo.featureType
    });
    this._doPOST(this._serializer.serializeToString(node),
      function(xmlhttp) {
        var data = xmlhttp.responseText;
        var result = this._readResponse(data);
        if (result) {
          var insertId = result.insertIds[0];
          if (insertId == 'new0') {
            // reload data if we're dealing with a shapefile store
            this._layer.getSource().clear();
          } else {
            feature.setId(insertId);
          }
        }
      },
      function(xmlhttp) {
        this.deactivate();
        this._setError(xmlhttp.status + ' ' + xmlhttp.statusText);
      },
      this
    );
  }
  _drawFeature() {
    var layerId = this._layer.get('id');
    var wfsInfo = this._layer.get('wfsInfo');
    var source = this._layer.getSource();
    if (!this._interactions[layerId]) {
      this._interactions[layerId] = {
        draw:  new ol.interaction.Draw({
          source: source,
          type: wfsInfo.geometryType,
          geometryName: wfsInfo.geometryName
        })
      };
      this._interactions[layerId].draw.on('drawend', this._onDrawEnd, this);
    }
    var draw = this._interactions[layerId].draw;
    this.deactivate();
    this.activate([draw]);
  }
  render() {
    if (this.props.layer) {
      this._setLayer(this.props.layer);
    }
    const {formatMessage} = this.props.intl;
    var error;
    if (this.state.error === true) {
      error = (<div className='error-alert'><Pui.ErrorAlert dismissable={false} withIcon={true}>{formatMessage(messages.errormsg, {msg: this.state.msg})}</Pui.ErrorAlert></div>);
    }
    var layerSelector;
    if (!this.props.layer) {
      layerSelector = (
        <article>
          <label htmlFor='layerSelector'>{formatMessage(messages.layerlabel)}</label>
          <LayerSelector id='layerSelector' ref='layerSelector' filter={this._filterLayerList} map={this.props.map} />
        </article>
      );
    }
    return (
      <form onSubmit={this._onSubmit} role='form'>
        {layerSelector}
        <UI.DefaultButton onClick={this._drawFeature.bind(this)}>{formatMessage(messages.drawfeature)}</UI.DefaultButton>
        <UI.DefaultButton onClick={this._modifyFeature.bind(this)}>{formatMessage(messages.modifyfeature)}</UI.DefaultButton>
        <UI.DefaultButton onClick={this._deleteFeature.bind(this)}>{formatMessage(messages.deletefeature)}</UI.DefaultButton>
        {error}
      </form>
    );
  }
}

WFST.propTypes = {
  /**
   * The ol3 map whose layers can be used for the WFS-T tool.
   */
  map: React.PropTypes.instanceOf(ol.Map).isRequired,
  /**
   * The layer to use for this WFS-T tool. If not provided, a combo box will be presented to the user.
   */
  layer: React.PropTypes.instanceOf(ol.layer.Vector),
  /**
   * i18n message strings. Provided through the application through context.
   */
  intl: intlShape.isRequired
};

export default injectIntl(WFST);
