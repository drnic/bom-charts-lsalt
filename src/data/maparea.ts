import * as gaf from './gaf';
import * as turf from '@turf/helpers';

export type MapArea = MajorArea | SubArea;

abstract class MapAreaBase {
  // QLD-S, NSW-E
  gafAreaCode: string;
  gafArea: gaf.CommonArea;
  _uuid: string;
  _turfPolygon: turf.Feature<turf.Polygon, turf.Properties>;

  constructor(gafAreaCode: string, gafArea: gaf.CommonArea) {
    this.gafAreaCode = gafAreaCode;
    this.gafArea = gafArea;
  }

  uuid(): string {
    if (this._uuid === undefined) {
      this._uuid = '_' + Math.random().toString(36).substr(2, 9);
    }
    return this._uuid;
  }

  boundaryPoints() { return this.gafArea["boundary"]["points"]; }
  turfPolygon() : turf.Feature<turf.Polygon, turf.Properties> {
    if (this._turfPolygon === undefined) {
      this._turfPolygon = turf.polygon([this.boundaryPoints()]);
    }
    return this._turfPolygon;
  }

  /**
   * Pilots flying below clouds must maintain 1000' clearance (unless in class G), and maintain 500'+ above ground.
   * If night VFR, they must be 1000-1360' above highest point (lowest safe altitude/LSALT).
   * So we want to give them an indication of how much clearance between ground/LSALT and lowest cloud base.
   * We return a number between 0 (minimal to negative gap between cloud base and highest ground) and 3 (3000+ feet clearance).
   */
  lsaltColorLevel() : number {
    var areaCloudLayerBase = this.cloudBase() === undefined ? 10000 : this.cloudBase();
    var areaCloudLayerBaseCode = Math.round(areaCloudLayerBase / 1000);
    return Math.min(3, Math.max(0, areaCloudLayerBaseCode));
  }

  asFeature() : turf.Feature<turf.Polygon, turf.Properties> {
    return {
      "type": "Feature",
      "properties": {
        "mapLayerID": this.mapLayerID(),
        "lsaltColorLevel": this.lsaltColorLevel(),
        "wxSummary": this.wxSummary(),
        "groupLabel": this.groupLabel()
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [this.boundaryPoints()]
      }
    };
  }

  cloudBase(): number { return this.gafArea.day_cloud_base; }
  wxSummary(): string {
    var text = `${this.gafAreaCode} ${this.mapLabel()}`;
    if (this.cloudBase() === undefined || this.cloudBase() === 999999) {
      text += ` has N/A clouds`;
    } else {
      text += ` has cloud base ${this.cloudBase()}MSL`;
    }
    return text;
  }

  abstract areaGroup() : string;
  abstract gafAreaCodeAndGroup() : string;
  abstract groupLabel() : string;
  abstract majorArea() : MajorArea;
  abstract isSubArea() : boolean;
  abstract freezingLevel() : string;
  abstract mapLabel() : string;
  abstract mapLayerID() : string;

  toJSON() : gaf.MapAreaExport {
    return {
      gafAreaCode: this.gafAreaCode,
      mapLayerID: this.mapLayerID(),
      mapLabel: this.mapLabel(),
      gafAreaCodeAndGroup: this.gafAreaCodeAndGroup(),
      freezingLevel: this.freezingLevel()
      // wxConds: this.wxConds() - major only
    }
  }
}

export class MajorArea extends MapAreaBase {
  gafMajorArea: gaf.Area;

  // gafAreaCode - "QLD-S"
  // gafArea - "{"area-id":"A","wx-cond":[{"surface-vis-wx":{"text":">10KM NIL","surface-vis":10000},"cloud-ice-turb":[{"text":"BKN ST 1500/2500FT LAND A1 ONLY TL 02Z","sub-areas-mentioned":["A1"],"parsed":{"cloud":{"amount":"BKN","type":"ST","base":1500,"top":2500}}},{"text":"SCT CU/SC 3000/10000FT, BKN A1 TL 02Z","sub-areas-mentioned":["A1"],"parsed":{"cloud":{"amount":"SCT","type":"CU/SC","base":3000,"top":10000}}}]},{"surface-vis-wx":{"text":"5000M ISOL FU BLW 8000FT LAND","surface-vis":5000},"cloud-ice-turb":[]},{"surface-vis-wx":{"text":"3000M ISOL SHRA, SCT SEA","surface-vis":3000},"cloud-ice-turb":[{"text":"ISOL TCU 2500/ABV10000FT SEA","parsed":{"cumulus":{"amount":"ISOL","type":"TCU","base":2500,"top":10000}}},{"text":"BKN ST 0800/2500FT","parsed":{"cloud":{"amount":"BKN","type":"ST","base":800,"top":2500}}},{"text":"BKN CU/SC 2500/10000FT","parsed":{"cloud":{"amount":"BKN","type":"CU/SC","base":2500,"top":10000}}}]},{"surface-vis-wx":{"text":"2000M SCT DZ LAND S OF YMIM TL 02Z","surface-vis":2000},"cloud-ice-turb":[{"text":"SCT ST 1000/3000FT","parsed":{"cloud":{"amount":"SCT","type":"ST","base":1000,"top":3000}}},{"text":"OVC SC 2000/9000FT","parsed":{"cloud":{"amount":"OVC","type":"SC","base":2000,"top":9000}}}]}],"freezing-level":"10000FT","boundary":{"points":[[152.4,-23.16],...,[152.87,-23.16]]},"cloud-base":1500,"cloud-top":10000,"sub-areas":[{"area-id":"A","sub-area-id":"A1","boundary":{"points":[[153.27,-24.28],...,[153.31,-24.38]]},"cloud-base":1500,"cloud-top":10000}]}"
  constructor(gafAreaCode: string, gafArea: gaf.Area) {
    super(gafAreaCode, gafArea);
    this.gafMajorArea = gafArea;
  }

  // A, B, C
  areaGroup() { return this.gafArea.area_id; }

  // QLD-S-A, NSW-E-C, TAS-B
  gafAreaCodeAndGroup() { return `${this.gafAreaCode}-${this.areaGroup()}`; }

  majorArea() : MajorArea { return this; }
  isSubArea() { return false; }

  freezingLevel() { return this.gafMajorArea.freezing_level; }
  mapLabel() { return this.gafArea.area_id; }

  mapLayerID() {
    return "maparea" + "_" + this.gafAreaCode + "_" + this.mapLabel() + this.uuid();
  }

  // returns "QLD-S-A", "TAS-B"
  groupLabel() { return this.gafAreaCode + "-" + this.mapLabel(); }

  // Specific to MapMajorArea
  wxConds() { return this.gafMajorArea.wx_cond; }

  toJSON() : gaf.MapAreaExport {
    let base = super.toJSON();
    base["wxConds"] = this.wxConds();
    return base;
  }
}

export class SubArea extends MapAreaBase {
  mapArea: MajorArea;
  gafSubArea: gaf.SubArea;

  // mapArea - instance of MapMajorArea
  // gafSubArea - {"area-id":"A","sub-area-id":"A1","boundary":{"points":[[153.27,-24.28],...,[153.31,-24.38]]},"cloud-base":1500,"cloud-top":10000}"
  constructor(mapArea: MajorArea, gafSubArea: gaf.SubArea) {
    super(mapArea.gafAreaCode, gafSubArea);
    this.mapArea = mapArea;
    this.gafSubArea = gafSubArea;
  }

  majorArea() { return this.mapArea; }
  gafAreaCodeAndGroup() { return this.mapArea.gafAreaCodeAndGroup(); }
  isSubArea() { return true; }
  areaGroup() { return this.mapArea.areaGroup(); }
  freezingLevel() { return this.mapArea.freezingLevel(); }
  subAreaID() { return this.gafSubArea.sub_area_id; }
  mapLabel() { return this.subAreaID(); }

  mapLayerID() {
    return "mapsubarea" + "_" + this.gafAreaCode + "_" + this.mapLabel() + this.uuid();
  }

  // returns "QLD-S-A", "TAS-B"
  groupLabel() { return this.mapArea.groupLabel(); }

  asFeature() : turf.Feature<turf.Polygon, turf.Properties> {
    let feature = super.asFeature();
    feature.properties["subAreaID"] = this.subAreaID();
    return feature;
  }
}
