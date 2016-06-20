# jquery.graph.js

Make bar graphics or pie charts using HTML5 canvas

```javascript
  //selector must be a set of <canvas> elements
  var graphs = $(selector).CanvasGraph({colorSet : ['#60A0F0','#5060A0']})
  // dataSet must be an Array of [string, float] pair, or Object of string:float
  graphs.drawGraph(dataSet, {title:'My Title'})
```


