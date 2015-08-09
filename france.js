function france(id, url, domain, range, title, unit, plus) {

  this.init = function() {
                self.map = L.map(id, { center: [46.6, 2.1], zoom: 6, minZoom: 6, maxZoom: 9, renderer: L.canvas({padding: .4})})
                           .addLayer(new L.tileLayer('https://cartodb-basemaps-b.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', {
                              subdomains: 'abcd', detectRetina: true }));

                d3.json('/data/geo/base.topojson', function (e, json){
                  d3.csv('/data/stats/data.csv', function (e, data){
                    d3.csv(url, function (e, stats){
                      self.layers = {};
                      self.names = self.read(data);
                      self.alpha = self.read(data,2);
                      self.stats = self.read(stats);

                      self.info();
                      self.look();
                      self.draw(json);
                      self.map.on({zoomend: self.show, dragend: self.show});

                      if(self.map.getZoom() <= 8) {
                        for (l in self.layers) {
                          if (l.slice(0,3) == "can") self.map.addLayer(self.layers[l]);
                        }
                      }

                    })
                  })
                })
              }

  this.draw = function(json) {
                for (key in json.objects) {
                  geojson = topojson.feature(json, json.objects[key]);
                  new L.GeoJSON(geojson, {
                    smoothFactor: .3,
                    onEachFeature: function (feature, json) {
                      self.layers[key] = self.layers[key] || new L.layerGroup();
                      self.layers[key].addLayer(json);
                      json.on({
                        mouseover: function(e) {
                          e.target.setStyle({stroke: 1});
                          d3.selectAll(".info .value").text(self.names[e.target.feature.id]+" : "+self.stats[e.target.feature.id].replace(".",",")+" "+unit) ;
                        },
                        mouseout: function(e) {
                          e.target.setStyle({stroke: 0});
                          d3.selectAll(".info .value").text("").append("span").text("Survolez un territoire") ;
                        }
                      })
                    },
                    style: function(feature){
                      return {
                        color: "#333", weight: 1, stroke: 0, opacity: .5,
                        fillOpacity: d3.scale.log().clamp(1).domain([1,15000]).range([0,1])(self.alpha[feature.id]),
                        fillColor: d3.scale.linear().clamp(1).domain(domain).range(range)(self.stats[feature.id])
                      }
                    }
                  })
                }
              }

  this.show = function() {
                if(self.map.getZoom() > 8) {
                  for (dep in d=self.layers["dep"]["_layers"]) {
                    if (self.map.getBounds().overlaps(d[dep].getBounds())) {
                      self.load(d[dep].feature.id)
                    }
                  }
                }
              }

  this.load =  function(i, callback) {
                if (self.layers["com-"+i]) {
                  if (callback) callback();
                }
                else {
                  d3.json('/data/geo/com'+i+'.topojson', function (e, json){
                    self.draw(json);
                    self.map.removeLayer(self.layers["can-"+i]);
                    self.map.addLayer(self.layers["com-"+i]);
                    if (callback) callback();
                  })
                }
              }

  this.read = function(csv, col) {
                array = {};
                for (obj in csv) array[csv[obj].insee] = csv[obj][Object.keys(csv[0])[(col || 1)]];
                return array;
              }

  this.info = function() {
                d3.selectAll(".info").remove();

                var div = d3.select(".leaflet-bottom.leaflet-left").append("div").attr("class", "info leaflet-control")
                div.append("div").attr("class", "title").text(title).append("span").text(" (en "+unit+")");
                div.append("div").attr("class", "value").text("").append("span").text("Survolez un territoire");

                var x = d3.scale.linear().domain([domain[0], domain[domain.length-1]]).range([1, 239]);
                var canvas = div.append("canvas").attr("height",10).attr("width",250).node().getContext("2d");
                var gradient = canvas.createLinearGradient(0,0,240,10);
                for ( el in a = range.map(function(d, i) { return { x: x(domain[i]), z:d }})) gradient.addColorStop(a[el].x/239,a[el].z);
                canvas.fillStyle = gradient;
                canvas.fillRect(10,0,240,10);

                div.append("svg").attr("width", 260).attr("height", 14).append("g").attr("transform", "translate(10,0)").attr("class", "key")
                   .call(d3.svg.axis().scale(x).tickFormat(d3.format((''||plus)+'.0f')).tickValues(domain).tickSize(3));
              }

  this.fill = function (url, _domain, _range, _title, _unit, _plus) {
                d3.csv(url, function (e, csv){
                  self.stats = self.read(csv);
                  title = _title, unit = _unit, range = _range, domain = _domain, plus = _plus;
                  for (l in self.layers) {
                    for (el in c=self.layers[l]["_layers"]) {
                      c[el].setStyle({ fillColor: d3.scale.linear().clamp(1).domain(domain).range(range)(self.stats[c[el].feature.id]) })
                    }
                  }
                  if (self.i) self.jump(self.i, 0);
                  self.info();
                })
              }

  this.jump = function(i, fly) {
                self.load(i.slice(0,2), function() {
                  for (el in c=self.layers["com-"+i.slice(0,2)]["_layers"]) {
                    if (i == c[el].feature.id) {
                      var b = c[el].getBounds(); self.i = i;
                      self.popup = L.popup().setLatLng(L.latLng(b.getNorth(), (b.getWest()+b.getEast())/2))
                                    .setContent('<strong>'+self.names[i]+'</strong><br />'+
                                      title+' : '+self.stats[i].replace(".",",")+' '+unit+'</p>').openOn(self.map);
                      if (fly != 0) self.map.flyToBounds(b);
                    }
                  }
                })
              }

  this.look = function(i) {
              var list = []; for (c in n = self.names) { if (c.slice(2,3) != "-") list.push(n[c]+" ("+c.slice(0,2)+")"); }
              var div = d3.select(".leaflet-top.leaflet-left").append("div").attr("class", "search leaflet-control");
              window.input = div.append("input").attr("type", "text").attr("id", "search");
              new Awesomplete( document.getElementById("search"), { list: list, maxItems: 20 });
              L.DomEvent.disableClickPropagation(div.node());
              L.DomEvent.on(div.node(), 'mousewheel', L.DomEvent.stopPropagation);
              input.on('awesomplete-selectcomplete', function(){
                var value = input.node().value;
                for (c in n = self.names) {
                  if (c.slice(0,2) == value.slice(-3,-1) && n[c] == value.slice(0,-5) ) self.jump(c);
                }
              });
            }

  var self = this;
  self.init();

}
