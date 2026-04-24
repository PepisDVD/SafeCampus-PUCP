export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alembic_version: {
        Row: {
          version_num: string
        }
        Insert: {
          version_num: string
        }
        Update: {
          version_num?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      canal_notificacion: "EMAIL" | "PUSH" | "SMS" | "WHATSAPP" | "INAPP"
      estado_acompanamiento:
        | "PENDIENTE"
        | "ACTIVO"
        | "ALERTA"
        | "FINALIZADO"
        | "CANCELADO"
      estado_alerta: "ACTIVA" | "ATENDIDA" | "CANCELADA"
      estado_caso_lf:
        | "ABIERTO"
        | "EN_REVISION"
        | "DEVUELTO"
        | "DESCARTADO"
        | "CERRADO"
      estado_incidente:
        | "RECIBIDO"
        | "EN_EVALUACION"
        | "EN_ATENCION"
        | "ESCALADO"
        | "PENDIENTE_INFO"
        | "RESUELTO"
        | "CERRADO"
      estado_notificacion: "PENDIENTE" | "ENVIADA" | "FALLIDA" | "DESCARTADA"
      estado_reporte: "RECIBIDO" | "NORMALIZADO" | "ENRUTADO" | "ERROR"
      estado_servicio: "OK" | "DEGRADADO" | "CAIDO" | "DESCONOCIDO"
      estado_sesion: "ACTIVA" | "EXPIRADA" | "REVOCADA"
      estado_usuario: "ACTIVO" | "INACTIVO" | "SUSPENDIDO"
      nivel_severidad: "BAJO" | "MEDIO" | "ALTO" | "CRITICO"
      origen_clasificacion: "IA" | "REGLA" | "FALLBACK" | "HUMANO"
      tipo_alerta_as: "MANUAL" | "VENCIMIENTO" | "DESCONEXION"
      tipo_canal: "WEB" | "MOVIL" | "MENSAJERIA"
      tipo_caso_lf: "PERDIDO" | "ENCONTRADO"
      tipo_dispositivo: "WEB" | "MOVIL" | "TABLET"
      tipo_evento_as:
        | "INICIO"
        | "ALERTA"
        | "DESCONEXION"
        | "RECONEXION"
        | "FIN"
        | "CANCELACION"
      tipo_kpi: "FRT" | "TMR" | "VOLUMEN" | "DISTRIBUCION" | "TASA_RESOLUCION"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
  sc_acompanamiento: {
    Tables: {
      acompanamiento_seguro: {
        Row: {
          contacto_emergencia_nombre: string | null
          contacto_emergencia_tel: string | null
          created_at: string
          duracion_estimada_min: number | null
          estado: Database["public"]["Enums"]["estado_acompanamiento"]
          fecha_fin: string | null
          fecha_inicio: string | null
          geom_destino: unknown
          geom_origen: unknown
          id: string
          lugar_destino: string | null
          lugar_origen: string | null
          notas: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_tel?: string | null
          created_at?: string
          duracion_estimada_min?: number | null
          estado?: Database["public"]["Enums"]["estado_acompanamiento"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          geom_destino: unknown
          geom_origen: unknown
          id?: string
          lugar_destino?: string | null
          lugar_origen?: string | null
          notas?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_tel?: string | null
          created_at?: string
          duracion_estimada_min?: number | null
          estado?: Database["public"]["Enums"]["estado_acompanamiento"]
          fecha_fin?: string | null
          fecha_inicio?: string | null
          geom_destino?: unknown
          geom_origen?: unknown
          id?: string
          lugar_destino?: string | null
          lugar_origen?: string | null
          notas?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      alerta_acompanamiento: {
        Row: {
          acomp_id: string
          atendida_por_id: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_alerta"]
          fecha_atencion: string | null
          geom: unknown
          id: string
          mensaje: string | null
          tipo: Database["public"]["Enums"]["tipo_alerta_as"]
          updated_at: string
        }
        Insert: {
          acomp_id: string
          atendida_por_id?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_alerta"]
          fecha_atencion?: string | null
          geom?: unknown
          id?: string
          mensaje?: string | null
          tipo: Database["public"]["Enums"]["tipo_alerta_as"]
          updated_at?: string
        }
        Update: {
          acomp_id?: string
          atendida_por_id?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_alerta"]
          fecha_atencion?: string | null
          geom?: unknown
          id?: string
          mensaje?: string | null
          tipo?: Database["public"]["Enums"]["tipo_alerta_as"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerta_acompanamiento_acomp_id_fkey"
            columns: ["acomp_id"]
            isOneToOne: false
            referencedRelation: "acompanamiento_seguro"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_acompanamiento: {
        Row: {
          acomp_id: string
          created_at: string
          detalle: Json | null
          id: string
          tipo: Database["public"]["Enums"]["tipo_evento_as"]
        }
        Insert: {
          acomp_id: string
          created_at?: string
          detalle?: Json | null
          id?: string
          tipo: Database["public"]["Enums"]["tipo_evento_as"]
        }
        Update: {
          acomp_id?: string
          created_at?: string
          detalle?: Json | null
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_evento_as"]
        }
        Relationships: [
          {
            foreignKeyName: "evento_acompanamiento_acomp_id_fkey"
            columns: ["acomp_id"]
            isOneToOne: false
            referencedRelation: "acompanamiento_seguro"
            referencedColumns: ["id"]
          },
        ]
      }
      ubicacion_trayecto: {
        Row: {
          acomp_id: string
          bearing: number | null
          created_at: string
          geom: unknown
          id: string
          precision_metros: number | null
          velocidad: number | null
        }
        Insert: {
          acomp_id: string
          bearing?: number | null
          created_at?: string
          geom: unknown
          id?: string
          precision_metros?: number | null
          velocidad?: number | null
        }
        Update: {
          acomp_id?: string
          bearing?: number | null
          created_at?: string
          geom?: unknown
          id?: string
          precision_metros?: number | null
          velocidad?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ubicacion_trayecto_acomp_id_fkey"
            columns: ["acomp_id"]
            isOneToOne: false
            referencedRelation: "acompanamiento_seguro"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  sc_auditoria: {
    Tables: {
      registro_auditoria: {
        Row: {
          accion: string
          detalle: Json | null
          dispositivo: string | null
          entidad: string | null
          entidad_id: string | null
          fecha_registro: string
          id: string
          ip_origen: unknown
          modulo: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          detalle?: Json | null
          dispositivo?: string | null
          entidad?: string | null
          entidad_id?: string | null
          fecha_registro?: string
          id?: string
          ip_origen?: unknown
          modulo: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          detalle?: Json | null
          dispositivo?: string | null
          entidad?: string | null
          entidad_id?: string | null
          fecha_registro?: string
          id?: string
          ip_origen?: unknown
          modulo?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  sc_clasificacion: {
    Tables: {
      clasificacion_ia: {
        Row: {
          categoria_final: string | null
          categoria_sugerida: string | null
          confianza: number | null
          confirmado_por_id: string | null
          created_at: string
          fecha_confirmacion: string | null
          id: string
          incidente_id: string
          modelo_utilizado: string | null
          origen: Database["public"]["Enums"]["origen_clasificacion"]
          prompt_version: string | null
          regla_clasificacion_id: string | null
          respuesta_raw: Json | null
          severidad_final: Database["public"]["Enums"]["nivel_severidad"] | null
          severidad_sugerida:
            | Database["public"]["Enums"]["nivel_severidad"]
            | null
          tiempo_respuesta_ms: number | null
          tokens_consumidos: number | null
          updated_at: string
        }
        Insert: {
          categoria_final?: string | null
          categoria_sugerida?: string | null
          confianza?: number | null
          confirmado_por_id?: string | null
          created_at?: string
          fecha_confirmacion?: string | null
          id?: string
          incidente_id: string
          modelo_utilizado?: string | null
          origen: Database["public"]["Enums"]["origen_clasificacion"]
          prompt_version?: string | null
          regla_clasificacion_id?: string | null
          respuesta_raw?: Json | null
          severidad_final?:
            | Database["public"]["Enums"]["nivel_severidad"]
            | null
          severidad_sugerida?:
            | Database["public"]["Enums"]["nivel_severidad"]
            | null
          tiempo_respuesta_ms?: number | null
          tokens_consumidos?: number | null
          updated_at?: string
        }
        Update: {
          categoria_final?: string | null
          categoria_sugerida?: string | null
          confianza?: number | null
          confirmado_por_id?: string | null
          created_at?: string
          fecha_confirmacion?: string | null
          id?: string
          incidente_id?: string
          modelo_utilizado?: string | null
          origen?: Database["public"]["Enums"]["origen_clasificacion"]
          prompt_version?: string | null
          regla_clasificacion_id?: string | null
          respuesta_raw?: Json | null
          severidad_final?:
            | Database["public"]["Enums"]["nivel_severidad"]
            | null
          severidad_sugerida?:
            | Database["public"]["Enums"]["nivel_severidad"]
            | null
          tiempo_respuesta_ms?: number | null
          tokens_consumidos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clasificacion_ia_regla_clasificacion_id_fkey"
            columns: ["regla_clasificacion_id"]
            isOneToOne: false
            referencedRelation: "regla_clasificacion"
            referencedColumns: ["id"]
          },
        ]
      }
      regla_clasificacion: {
        Row: {
          activa: boolean
          categoria_resultado: string
          condicion: Json
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          prioridad: number
          severidad_resultado: Database["public"]["Enums"]["nivel_severidad"]
          updated_at: string
        }
        Insert: {
          activa?: boolean
          categoria_resultado: string
          condicion: Json
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          prioridad?: number
          severidad_resultado: Database["public"]["Enums"]["nivel_severidad"]
          updated_at?: string
        }
        Update: {
          activa?: boolean
          categoria_resultado?: string
          condicion?: Json
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          prioridad?: number
          severidad_resultado?: Database["public"]["Enums"]["nivel_severidad"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  sc_dashboard: {
    Tables: {
      estado_integracion: {
        Row: {
          created_at: string
          detalle: Json | null
          estado: Database["public"]["Enums"]["estado_servicio"]
          id: string
          servicio: string
          tiempo_respuesta_ms: number | null
          ultimo_check: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          detalle?: Json | null
          estado?: Database["public"]["Enums"]["estado_servicio"]
          id?: string
          servicio: string
          tiempo_respuesta_ms?: number | null
          ultimo_check?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          detalle?: Json | null
          estado?: Database["public"]["Enums"]["estado_servicio"]
          id?: string
          servicio?: string
          tiempo_respuesta_ms?: number | null
          ultimo_check?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kpi_operativo: {
        Row: {
          created_at: string
          desglose: Json | null
          id: string
          periodo: string
          tipo: Database["public"]["Enums"]["tipo_kpi"]
          unidad: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          desglose?: Json | null
          id?: string
          periodo: string
          tipo: Database["public"]["Enums"]["tipo_kpi"]
          unidad?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          desglose?: Json | null
          id?: string
          periodo?: string
          tipo?: Database["public"]["Enums"]["tipo_kpi"]
          unidad?: string | null
          valor?: number
        }
        Relationships: []
      }
      reporte_exportado: {
        Row: {
          created_at: string
          filtros: Json | null
          formato: string
          generado_por_id: string
          id: string
          ruta_archivo: string
          tamano_bytes: number | null
          titulo: string
        }
        Insert: {
          created_at?: string
          filtros?: Json | null
          formato: string
          generado_por_id: string
          id?: string
          ruta_archivo: string
          tamano_bytes?: number | null
          titulo: string
        }
        Update: {
          created_at?: string
          filtros?: Json | null
          formato?: string
          generado_por_id?: string
          id?: string
          ruta_archivo?: string
          tamano_bytes?: number | null
          titulo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  sc_incidentes: {
    Tables: {
      asignacion_recurso: {
        Row: {
          asignado_por_id: string
          created_at: string
          descripcion: string
          fecha_asignacion: string
          fecha_liberacion: string | null
          id: string
          incidente_id: string
          notas: string | null
          tipo_recurso: string
        }
        Insert: {
          asignado_por_id: string
          created_at?: string
          descripcion: string
          fecha_asignacion?: string
          fecha_liberacion?: string | null
          id?: string
          incidente_id: string
          notas?: string | null
          tipo_recurso: string
        }
        Update: {
          asignado_por_id?: string
          created_at?: string
          descripcion?: string
          fecha_asignacion?: string
          fecha_liberacion?: string | null
          id?: string
          incidente_id?: string
          notas?: string | null
          tipo_recurso?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignacion_recurso_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidente"
            referencedColumns: ["id"]
          },
        ]
      }
      comentario_incidente: {
        Row: {
          autor_id: string
          contenido: string
          created_at: string
          es_interno: boolean
          id: string
          incidente_id: string
          updated_at: string
        }
        Insert: {
          autor_id: string
          contenido: string
          created_at?: string
          es_interno?: boolean
          id?: string
          incidente_id: string
          updated_at?: string
        }
        Update: {
          autor_id?: string
          contenido?: string
          created_at?: string
          es_interno?: boolean
          id?: string
          incidente_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentario_incidente_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidente"
            referencedColumns: ["id"]
          },
        ]
      }
      evidencia: {
        Row: {
          cargado_por_id: string
          created_at: string
          descripcion: string | null
          id: string
          incidente_id: string
          mime_type: string | null
          nombre_archivo: string
          tamano_bytes: number | null
          tipo_archivo: string
          url_archivo: string
        }
        Insert: {
          cargado_por_id: string
          created_at?: string
          descripcion?: string | null
          id?: string
          incidente_id: string
          mime_type?: string | null
          nombre_archivo: string
          tamano_bytes?: number | null
          tipo_archivo: string
          url_archivo: string
        }
        Update: {
          cargado_por_id?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          incidente_id?: string
          mime_type?: string | null
          nombre_archivo?: string
          tamano_bytes?: number | null
          tipo_archivo?: string
          url_archivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidencia_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidente"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_incidente: {
        Row: {
          accion: string
          comentario: string | null
          created_at: string
          ejecutado_por_id: string
          estado_anterior:
            | Database["public"]["Enums"]["estado_incidente"]
            | null
          estado_nuevo: Database["public"]["Enums"]["estado_incidente"]
          id: string
          incidente_id: string
        }
        Insert: {
          accion: string
          comentario?: string | null
          created_at?: string
          ejecutado_por_id: string
          estado_anterior?:
            | Database["public"]["Enums"]["estado_incidente"]
            | null
          estado_nuevo: Database["public"]["Enums"]["estado_incidente"]
          id?: string
          incidente_id: string
        }
        Update: {
          accion?: string
          comentario?: string | null
          created_at?: string
          ejecutado_por_id?: string
          estado_anterior?:
            | Database["public"]["Enums"]["estado_incidente"]
            | null
          estado_nuevo?: Database["public"]["Enums"]["estado_incidente"]
          id?: string
          incidente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_incidente_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidente"
            referencedColumns: ["id"]
          },
        ]
      }
      incidente: {
        Row: {
          canal_origen: Database["public"]["Enums"]["tipo_canal"]
          categoria: string | null
          codigo: string
          created_at: string
          deleted_at: string | null
          descripcion: string
          es_anonimo: boolean
          estado: Database["public"]["Enums"]["estado_incidente"]
          fecha_primera_respuesta: string | null
          fecha_resolucion: string | null
          geom: unknown
          id: string
          lugar_referencia: string | null
          notas_internas: string | null
          operador_asignado_id: string | null
          prioridad_manual: number | null
          reportante_id: string
          severidad: Database["public"]["Enums"]["nivel_severidad"] | null
          subcategoria: string | null
          supervisor_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          canal_origen: Database["public"]["Enums"]["tipo_canal"]
          categoria?: string | null
          codigo: string
          created_at?: string
          deleted_at?: string | null
          descripcion: string
          es_anonimo?: boolean
          estado?: Database["public"]["Enums"]["estado_incidente"]
          fecha_primera_respuesta?: string | null
          fecha_resolucion?: string | null
          geom?: unknown
          id?: string
          lugar_referencia?: string | null
          notas_internas?: string | null
          operador_asignado_id?: string | null
          prioridad_manual?: number | null
          reportante_id: string
          severidad?: Database["public"]["Enums"]["nivel_severidad"] | null
          subcategoria?: string | null
          supervisor_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          canal_origen?: Database["public"]["Enums"]["tipo_canal"]
          categoria?: string | null
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          descripcion?: string
          es_anonimo?: boolean
          estado?: Database["public"]["Enums"]["estado_incidente"]
          fecha_primera_respuesta?: string | null
          fecha_resolucion?: string | null
          geom?: unknown
          id?: string
          lugar_referencia?: string | null
          notas_internas?: string | null
          operador_asignado_id?: string | null
          prioridad_manual?: number | null
          reportante_id?: string
          severidad?: Database["public"]["Enums"]["nivel_severidad"] | null
          subcategoria?: string | null
          supervisor_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      ubicacion_incidente: {
        Row: {
          altitud: number | null
          created_at: string
          descripcion: string | null
          fuente: string | null
          geom: unknown
          id: string
          incidente_id: string
          precision_metros: number | null
        }
        Insert: {
          altitud?: number | null
          created_at?: string
          descripcion?: string | null
          fuente?: string | null
          geom: unknown
          id?: string
          incidente_id: string
          precision_metros?: number | null
        }
        Update: {
          altitud?: number | null
          created_at?: string
          descripcion?: string | null
          fuente?: string | null
          geom?: unknown
          id?: string
          incidente_id?: string
          precision_metros?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ubicacion_incidente_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidente"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  sc_kpi: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  sc_lost_found: {
    Tables: {
      caso_lost_found: {
        Row: {
          categoria_id: string | null
          cerrado_por_id: string | null
          codigo: string
          contacto_info: string | null
          created_at: string
          descripcion: string
          estado: Database["public"]["Enums"]["estado_caso_lf"]
          fecha_evento: string | null
          foto_url: string | null
          geom: unknown
          id: string
          lugar_referencia: string | null
          notas: string | null
          reportante_id: string
          tipo: Database["public"]["Enums"]["tipo_caso_lf"]
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          cerrado_por_id?: string | null
          codigo: string
          contacto_info?: string | null
          created_at?: string
          descripcion: string
          estado?: Database["public"]["Enums"]["estado_caso_lf"]
          fecha_evento?: string | null
          foto_url?: string | null
          geom?: unknown
          id?: string
          lugar_referencia?: string | null
          notas?: string | null
          reportante_id: string
          tipo: Database["public"]["Enums"]["tipo_caso_lf"]
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          cerrado_por_id?: string | null
          codigo?: string
          contacto_info?: string | null
          created_at?: string
          descripcion?: string
          estado?: Database["public"]["Enums"]["estado_caso_lf"]
          fecha_evento?: string | null
          foto_url?: string | null
          geom?: unknown
          id?: string
          lugar_referencia?: string | null
          notas?: string | null
          reportante_id?: string
          tipo?: Database["public"]["Enums"]["tipo_caso_lf"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caso_lost_found_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria_objeto"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria_objeto: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          icono: string | null
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          icono?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          icono?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      historial_caso_lf: {
        Row: {
          accion: string
          caso_id: string
          comentario: string | null
          created_at: string
          ejecutado_por_id: string
          estado_anterior: Database["public"]["Enums"]["estado_caso_lf"] | null
          estado_nuevo: Database["public"]["Enums"]["estado_caso_lf"]
          id: string
        }
        Insert: {
          accion: string
          caso_id: string
          comentario?: string | null
          created_at?: string
          ejecutado_por_id: string
          estado_anterior?: Database["public"]["Enums"]["estado_caso_lf"] | null
          estado_nuevo: Database["public"]["Enums"]["estado_caso_lf"]
          id?: string
        }
        Update: {
          accion?: string
          caso_id?: string
          comentario?: string | null
          created_at?: string
          ejecutado_por_id?: string
          estado_anterior?: Database["public"]["Enums"]["estado_caso_lf"] | null
          estado_nuevo?: Database["public"]["Enums"]["estado_caso_lf"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_caso_lf_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "caso_lost_found"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  sc_notificaciones: {
    Tables: {
      notificacion: {
        Row: {
          asunto: string | null
          canal: Database["public"]["Enums"]["canal_notificacion"]
          contenido: string
          created_at: string
          destinatario_id: string
          error_detalle: string | null
          estado: Database["public"]["Enums"]["estado_notificacion"]
          fecha_envio: string | null
          fecha_lectura: string | null
          id: string
          incidente_id: string | null
          max_reintentos: number
          reintentos: number
          tipo_evento: string
          updated_at: string
        }
        Insert: {
          asunto?: string | null
          canal: Database["public"]["Enums"]["canal_notificacion"]
          contenido: string
          created_at?: string
          destinatario_id: string
          error_detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_notificacion"]
          fecha_envio?: string | null
          fecha_lectura?: string | null
          id?: string
          incidente_id?: string | null
          max_reintentos?: number
          reintentos?: number
          tipo_evento: string
          updated_at?: string
        }
        Update: {
          asunto?: string | null
          canal?: Database["public"]["Enums"]["canal_notificacion"]
          contenido?: string
          created_at?: string
          destinatario_id?: string
          error_detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_notificacion"]
          fecha_envio?: string | null
          fecha_lectura?: string | null
          id?: string
          incidente_id?: string | null
          max_reintentos?: number
          reintentos?: number
          tipo_evento?: string
          updated_at?: string
        }
        Relationships: []
      }
      plantilla_notificacion: {
        Row: {
          activa: boolean
          asunto: string | null
          canal: Database["public"]["Enums"]["canal_notificacion"]
          created_at: string
          cuerpo_template: string
          id: string
          tipo_evento: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          activa?: boolean
          asunto?: string | null
          canal: Database["public"]["Enums"]["canal_notificacion"]
          created_at?: string
          cuerpo_template: string
          id?: string
          tipo_evento: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          activa?: boolean
          asunto?: string | null
          canal?: Database["public"]["Enums"]["canal_notificacion"]
          created_at?: string
          cuerpo_template?: string
          id?: string
          tipo_evento?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      preferencia_notificacion: {
        Row: {
          canal: Database["public"]["Enums"]["canal_notificacion"]
          created_at: string
          habilitado: boolean
          id: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          canal: Database["public"]["Enums"]["canal_notificacion"]
          created_at?: string
          habilitado?: boolean
          id?: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_notificacion"]
          created_at?: string
          habilitado?: boolean
          id?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  sc_omnicanal: {
    Tables: {
      canal_reporte: {
        Row: {
          activo: boolean
          configuracion: Json | null
          created_at: string
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_canal"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          configuracion?: Json | null
          created_at?: string
          id?: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_canal"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          configuracion?: Json | null
          created_at?: string
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_canal"]
          updated_at?: string
        }
        Relationships: []
      }
      reporte_entrante: {
        Row: {
          canal_id: string
          contenido_raw: string
          created_at: string
          es_correlacionado: boolean
          estado: Database["public"]["Enums"]["estado_reporte"]
          fecha_recepcion: string
          id: string
          incidente_id: string | null
          ip_origen: unknown
          metadatos_canal: Json | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          canal_id: string
          contenido_raw: string
          created_at?: string
          es_correlacionado?: boolean
          estado?: Database["public"]["Enums"]["estado_reporte"]
          fecha_recepcion?: string
          id?: string
          incidente_id?: string | null
          ip_origen?: unknown
          metadatos_canal?: Json | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          canal_id?: string
          contenido_raw?: string
          created_at?: string
          es_correlacionado?: boolean
          estado?: Database["public"]["Enums"]["estado_reporte"]
          fecha_recepcion?: string
          id?: string
          incidente_id?: string | null
          ip_origen?: unknown
          metadatos_canal?: Json | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reporte_entrante_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canal_reporte"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  sc_users: {
    Tables: {
      dispositivo_usuario: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string | null
          plataforma: string | null
          tipo: Database["public"]["Enums"]["tipo_dispositivo"]
          token_push: string
          ultimo_uso: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string | null
          plataforma?: string | null
          tipo: Database["public"]["Enums"]["tipo_dispositivo"]
          token_push: string
          ultimo_uso?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string | null
          plataforma?: string | null
          tipo?: Database["public"]["Enums"]["tipo_dispositivo"]
          token_push?: string
          ultimo_uso?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispositivo_usuario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      permiso: {
        Row: {
          accion: string
          created_at: string
          descripcion: string | null
          id: string
          modulo: string
        }
        Insert: {
          accion: string
          created_at?: string
          descripcion?: string | null
          id?: string
          modulo: string
        }
        Update: {
          accion?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          modulo?: string
        }
        Relationships: []
      }
      rol: {
        Row: {
          created_at: string
          descripcion: string | null
          es_sistema: boolean
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          es_sistema?: boolean
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          es_sistema?: boolean
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      rol_permiso: {
        Row: {
          created_at: string
          id: string
          permiso_id: string
          rol_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permiso_id: string
          rol_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permiso_id?: string
          rol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rol_permiso_permiso_id_fkey"
            columns: ["permiso_id"]
            isOneToOne: false
            referencedRelation: "permiso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rol_permiso_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "rol"
            referencedColumns: ["id"]
          },
        ]
      }
      sesion: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_sesion"]
          fecha_expiracion: string
          id: string
          ip_origen: unknown
          token_hash: string
          updated_at: string
          user_agent: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_sesion"]
          fecha_expiracion: string
          id?: string
          ip_origen?: unknown
          token_hash: string
          updated_at?: string
          user_agent?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_sesion"]
          fecha_expiracion?: string
          id?: string
          ip_origen?: unknown
          token_hash?: string
          updated_at?: string
          user_agent?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario: {
        Row: {
          apellido: string
          auth_provider: string | null
          auth_user_id: string | null
          avatar_url: string | null
          codigo_institucional: string | null
          created_at: string
          deleted_at: string | null
          departamento: string | null
          email: string
          email_verificado: boolean
          estado: Database["public"]["Enums"]["estado_usuario"]
          id: string
          nombre: string
          password_hash: string | null
          telefono: string | null
          ultimo_acceso: string | null
          updated_at: string
        }
        Insert: {
          apellido: string
          auth_provider?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          codigo_institucional?: string | null
          created_at?: string
          deleted_at?: string | null
          departamento?: string | null
          email: string
          email_verificado?: boolean
          estado?: Database["public"]["Enums"]["estado_usuario"]
          id?: string
          nombre: string
          password_hash?: string | null
          telefono?: string | null
          ultimo_acceso?: string | null
          updated_at?: string
        }
        Update: {
          apellido?: string
          auth_provider?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          codigo_institucional?: string | null
          created_at?: string
          deleted_at?: string | null
          departamento?: string | null
          email?: string
          email_verificado?: boolean
          estado?: Database["public"]["Enums"]["estado_usuario"]
          id?: string
          nombre?: string
          password_hash?: string | null
          telefono?: string | null
          ultimo_acceso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      usuario_rol: {
        Row: {
          asignado_por: string | null
          created_at: string
          id: string
          rol_id: string
          usuario_id: string
        }
        Insert: {
          asignado_por?: string | null
          created_at?: string
          id?: string
          rol_id: string
          usuario_id: string
        }
        Update: {
          asignado_por?: string | null
          created_at?: string
          id?: string
          rol_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_rol_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_rol_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "rol"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_rol_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      canal_notificacion: ["EMAIL", "PUSH", "SMS", "WHATSAPP", "INAPP"],
      estado_acompanamiento: [
        "PENDIENTE",
        "ACTIVO",
        "ALERTA",
        "FINALIZADO",
        "CANCELADO",
      ],
      estado_alerta: ["ACTIVA", "ATENDIDA", "CANCELADA"],
      estado_caso_lf: [
        "ABIERTO",
        "EN_REVISION",
        "DEVUELTO",
        "DESCARTADO",
        "CERRADO",
      ],
      estado_incidente: [
        "RECIBIDO",
        "EN_EVALUACION",
        "EN_ATENCION",
        "ESCALADO",
        "PENDIENTE_INFO",
        "RESUELTO",
        "CERRADO",
      ],
      estado_notificacion: ["PENDIENTE", "ENVIADA", "FALLIDA", "DESCARTADA"],
      estado_reporte: ["RECIBIDO", "NORMALIZADO", "ENRUTADO", "ERROR"],
      estado_servicio: ["OK", "DEGRADADO", "CAIDO", "DESCONOCIDO"],
      estado_sesion: ["ACTIVA", "EXPIRADA", "REVOCADA"],
      estado_usuario: ["ACTIVO", "INACTIVO", "SUSPENDIDO"],
      nivel_severidad: ["BAJO", "MEDIO", "ALTO", "CRITICO"],
      origen_clasificacion: ["IA", "REGLA", "FALLBACK", "HUMANO"],
      tipo_alerta_as: ["MANUAL", "VENCIMIENTO", "DESCONEXION"],
      tipo_canal: ["WEB", "MOVIL", "MENSAJERIA"],
      tipo_caso_lf: ["PERDIDO", "ENCONTRADO"],
      tipo_dispositivo: ["WEB", "MOVIL", "TABLET"],
      tipo_evento_as: [
        "INICIO",
        "ALERTA",
        "DESCONEXION",
        "RECONEXION",
        "FIN",
        "CANCELACION",
      ],
      tipo_kpi: ["FRT", "TMR", "VOLUMEN", "DISTRIBUCION", "TASA_RESOLUCION"],
    },
  },
  sc_acompanamiento: {
    Enums: {},
  },
  sc_auditoria: {
    Enums: {},
  },
  sc_clasificacion: {
    Enums: {},
  },
  sc_dashboard: {
    Enums: {},
  },
  sc_incidentes: {
    Enums: {},
  },
  sc_kpi: {
    Enums: {},
  },
  sc_lost_found: {
    Enums: {},
  },
  sc_notificaciones: {
    Enums: {},
  },
  sc_omnicanal: {
    Enums: {},
  },
  sc_users: {
    Enums: {},
  },
} as const
