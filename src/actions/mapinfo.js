/*
 * Copyright 2015-present Planet Federal Inc., http://www.planet.com
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations
 * under the License.
 */

/** @module actions/mapinfo
 *  @desc Actions for setting info about the map.
 */

import {MAPINFO} from '../action-types';

/** Action to set the map size.
 *  @param {number[]} size Map size in pixels.
 *
 *  @returns {Object} Action object to pass to reducer.
 */
export function setMapSize(size) {
  return {
    type: MAPINFO.SET_SIZE,
    size,
  };
}

/** Action to set the current mouse position.
 *  @param {Object} lngLat The longitude latitude object.
 *  @param {number[]} coordinate Coordinate pair in map projection.
 *
 *  @returns {Object} Action object to pass to reducer.
 */
export function setMousePosition(lngLat, coordinate) {
  return {
    type: MAPINFO.SET_MOUSE_POSITION,
    lngLat,
    coordinate,
  };
}

/** Action to set the map extent.
 *  @param {number[]} extent Map extent in EPSG:4326.
 *
 *  @returns {Object} Action object to pass to reducer.
 */
export function setMapExtent(extent) {
  return {
    type: MAPINFO.SET_EXTENT,
    extent,
  };
}

/** Action to set the resolution.
 *  @param {number} resolution Resolution.
 *
 *  @returns {Object} Action object to pass to reducer.
 */
export function setResolution(resolution) {
  return {
    type: MAPINFO.SET_RESOLUTION,
    resolution,
  };
}

/** Action to set the projection.
 *  @param {string} projection Projection.
 *
 *  @returns {Object} Action object to pass to reducer.
 */
export function setProjection(projection) {
  return {
    type: MAPINFO.SET_PROJECTION,
    projection,
  };
}

/** Request that the map redraws.
 *
 *  @returns {Object} Action object to request a map redraw.
 */
export function requestRedraw() {
  return {
    type: MAPINFO.REQUEST_REDRAW,
  };
}

/** Request that a source redraws.
 *
 *  @param {String} srcName - The name of the source to redraw.
 *
 *  @returns {Object} Action object to request a source redraw.
 */
export function requestSourceRedraw(srcName) {
  return {
    type: MAPINFO.REQUEST_SOURCE_REDRAW,
    srcName,
  };
}

/** Set an error for a source.
 *
 *  @param {String} srcName - The name of the source with the error
 *
 *  @returns {Object} Action object to set a source error.
 */
export function setSourceError(srcName) {
  return {
    type: MAPINFO.SET_SOURCE_ERROR,
    srcName,
  };
}

/** Clear the source errors
 *
 *  @returns {Object} Action object to clear all the source errors
 */
export function clearSourceErrors() {
  return {
    type: MAPINFO.CLEAR_SOURCE_ERRORS,
  };
}

/** Sets the map state to loading.
 *
 *  @returns {Object} Action object to set the map state to loading.
 */
export function setMapLoading() {
  return {
    type: MAPINFO.SET_MAP_LOADING,
  };
}

/** Sets the map state to loaded.
 *
 *  @returns {Object} Action object to set the map state to loaded.
 */
export function setMapLoaded() {
  return {
    type: MAPINFO.SET_MAP_LOADED,
  };
}
