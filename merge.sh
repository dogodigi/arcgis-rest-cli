if [ $# -eq 0 ]
  then
    echo "this script requires 2 arguments:"
    echo "  1: the basename of the input file, for instance:"
    echo "      mylinestrings for mylinestrings1_1_1000.geojson"
    echo "  2: the type, one of following:"
    echo "      POINT, LINESTRING, POLYGON"
  else
    BASE=$1 #pand_lijn
    FIRST=1
    TYPE=$2 #LINESTRING

    for f in $BASE*.geojson
      do
        if [[ $FIRST == 1 ]] ; then
          ogr2ogr -f "ESRI Shapefile" -nlt $TYPE -skipfailures merged $f -nln "$BASE"
          FIRST=0
        else
          ogr2ogr -update -append merged/$BASE.shp $f  -f "GeoJSON" -nln $BASE
        fi
     done
fi
