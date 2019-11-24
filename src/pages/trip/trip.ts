 
import { Component, NgZone, ViewChild, ElementRef, ComponentFactoryResolver, OnInit } from '@angular/core';
 
 
import { DeviceOrientation, DeviceOrientationCompassHeading } from '@ionic-native/device-orientation/ngx';
import { IonicPage, NavController, NavParams,Platform} from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';
import'leaflet';
import 'leaflet-routing-machine';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import { text } from '@angular/core/src/render3/instructions';
import { stringify } from '@angular/compiler/src/util';
import { a } from '@angular/core/src/render3';
import { HomePage } from '../home/home';
import{RestApiProvider } from '../../providers/rest-api/rest-api'
import { setDOM } from '@angular/platform-browser/src/dom/dom_adapter';
import { LatLng } from 'leaflet';
 
declare var L:any;

/**
 * Generated class for the TripPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-trip',
  templateUrl: 'trip.html',
})
export class TripPage {

@ViewChild('map') mapElement: ElementRef;
  
  map: any;
  marker ;
  trip_id ;
  startpoint ;
  endpoint ; 
  current_position:any={} ;  
  users_positions:any ; 
  trip_polyline ; 
  decodedPolyline  ; 
  deviceorientation:any ; 
  bikeIcon = L.icon({
    iconUrl: ('../../assets/images/position.png'),
    iconSize:     [32, 32], // size of the icon   
    });
  distance:any=null;
  popup:boolean=true ; 
  
 
  constructor(public navCtrl: NavController, public navParams: NavParams,public rest:RestApiProvider,
    public geolocation: Geolocation,public platform: Platform) {
      this.deviceorientation= new DeviceOrientation ; 
  }

  ngOnInit(){
    this.startpoint= this.navParams.get('startpoint') ; 
    this.endpoint = this.navParams.get('endpoint') ; 
    this.trip_id = this.navParams.get('route_id') ;
    this.trip_polyline = this.navParams.get('route') ; 

   
  }

  ionViewDidLoad() {
   this.setcurrentlocation();
   this.rest.getUsersPositions().then(data=>this.users_positions=data).then(()=>console.log(this.users_positions))
   .then(()=>this.load_positions(this.users_positions))
   .then(()=>this.loadmap()).then(()=>console.log(this.current_position));
   var _thisPrincipal=this
  setInterval(this.distanceCalculator.bind(this),4000);

  }
    ionViewCanLeave() {
      console.log("can leave")  ;
   document.getElementById("map").outerHTML = "";
   this.delete() ; 
  };
  ionViewWillLeave(){
   
  }
  ngOnDestroy(){
   
   
  };
 
  
  //Function to load the map
  loadmap(){
     
      this.map = L.map("map", {
        minZoom: 4
      }).fitWorld();
      L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        maxZoom: 23,
        attribution: ''
      }).addTo(this.map);
      
  // 
  // this.platform.ready().then(() => {


  //   this.geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }).then((resp) => {
  //     let pos = {
  //       lat: resp.coords.latitude,
  //       lng: resp.coords.longitude
  //     }
  //     this.current_position=pos ; 
     
  //   })

  // });
  


    this.geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }).then((resp) => {
      let pos = {
        lat: resp.coords.latitude,
        lng: resp.coords.longitude
      }
      this.current_position.lat=pos.lat ; 
      this.current_position.lng=pos.lng ;
     
    })

  
     
    this.map.setView([this.startpoint.lat,this.startpoint.lng],20);
     L.marker([this.startpoint.lat,this.startpoint.lng],{icon:this.bikeIcon}).addTo(this.map);

     
     this.decodedPolyline=this.decode(this.trip_polyline);
     
     
     var coordinates = this.decodedPolyline.map(waypoint => new L.LatLng(waypoint.latitude,waypoint.longitude))
   
       let polyline = L.polyline(
       coordinates,
       {  
           color:'grey',
           weight:8,
           opacity:0.9,
            lineJoin: 'round'
          
        }
     );
      
   
     
      
     polyline.on('click',(e)=>{
    
       
     })
     polyline.addTo(this.map);
   
     this.map.fitBounds(polyline.getBounds());
       //add markers to the map
       L.marker([this.startpoint.lat,this.startpoint.lng],{
         size:'5px' 
       }).addTo(this.map);
       L.marker([this.endpoint.lat,this.endpoint.lng],{
         color:'red' 
       }).addTo(this.map);
        
   
      
  
   
 }

 load_positions(positions){
  
 }

goHome(){
  this.navCtrl.setRoot(HomePage);
}

// function to delete a trip when the user quit the page
delete(){
console.log(this.trip_id) ;
 
 this.rest.update_trip(this.startpoint,`${this.trip_id}`,true,true)
  .then(()=> console.log("XXXXXXXXXXXXX")) ;
}

// function to decode trip geometr into waypoints
decode(encoded){

  // array that holds the points

  var points=[ ]
  var index = 0, len = encoded.length;
  var lat = 0, lng = 0;
  while (index < len) {
      var b, shift = 0, result = 0;
      do {

  b = encoded.charAt(index++).charCodeAt(0) - 63;//finds ascii                                                                                    //and substract it by 63
            result |= (b & 0x1f) << shift;
            shift += 5;
           } while (b >= 0x20);


     var dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
     lat += dlat;
    shift = 0;
    result = 0;
   do {
      b = encoded.charAt(index++).charCodeAt(0) - 63;
      result |= (b & 0x1f) << shift;
     shift += 5;
       } while (b >= 0x20);
   var dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
   lng += dlng;

 points.push({latitude:( lat / 1E5),longitude:( lng / 1E5)})  

}
return points
  }


// this function calculate the distance between the current position of the user and his arrival point
distanceCalculator(){
  if ((this.current_position.lat == this.endpoint.lat) && (this.current_position.lng == this.endpoint.lng)) {
   this.distance=0;
    return 0;
  }
  else {
    var radlat1 = Math.PI * this.current_position.lat/180;
    var radlat2 = Math.PI * this.endpoint.lat/180;
    var theta = this.current_position.lng - this.endpoint.lng ;
    var radtheta = Math.PI * theta/180;
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515;
    this.distance=dist * 1.609344
    console.log(dist * 1.609344);
    return dist * 1.609344;
}
}
calc(){
    
 
}
setcurrentlocation(){
  console.log("cuurent location setted");
  this.geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }).then((resp) => {
    let pos = {
      lat: resp.coords.latitude,
      lng: resp.coords.longitude
    }
    console.log(resp.coords.latitude);
    console.log(resp.coords.longitude);
    this.current_position.lat=pos.lat ; 
    this.current_position.lng=pos.lng ;
   
  })
  }
}
