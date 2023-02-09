# Lenis TS

All credit to Studio Freight for their Lenis library

> Built with TSDX

> More info on Lenis: https://github.com/studio-freight/lenis


## API differences vs SF Lenis:

Removed generic `lenis.on('scroll', callback)` API in favor of specific functions:

`addScrollStateListener(callback: ScrollStateCallback)`<br>
`removeScrollStateListener(callback: ScrollStateCallback)`

Event callbacks receive a precomputed ScrollState object to avoid using get functions and remove computing overhead:

### Adding event listeners

| Method                   | Callback Arguments | Returns
|--------------------------|--------------------|--------
| `addScrollStateListener` | `scroll`: scroll position in px.<br>`progress`: scroll progress respect page limit (0-1).<br>`limit`: scroll limit in px. <br>`velocity`: scroll velocity. | `UnsubscribeListener`
