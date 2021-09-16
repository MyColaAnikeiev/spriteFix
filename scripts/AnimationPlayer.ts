namespace AnimationPlayer{
    let frames: Frames;
    let flags: EditorFlags;
    let html: DomWalker;

    let handlersIsSetUp = false;

    let isRunning = false;
    let timeoutId: number;
    let showOnlyLast = 5;
    let currentFrameInd = 0;
    let playUntillSelected = false;
    let selectedFrameId = null;
    let playAllFrames = false;
    let timeInterval = 300;
    

    function log(...a) {console.log(...a)}

    export function setProject(pg: Project){
        flags = pg.flags;
        html = pg.html;

        init();
    }
    export function setAnimation(anim: SpriteAnimation){
        if(anim.frames == frames){
            return;
        }

        frames = anim.frames;
        if(isRunning){
            stop();
            start();
        }
    }

    function init(){
        playUntillSelected = html.animPreviewControls
            .untillSelectedCheckbox.checked
    }

    export function selectedFrameSet(num: number){
        selectedFrameId = num;
        stop();
        start();
    }
    export function selectedFrameUnset(){
        selectedFrameId = null;
        stop();
        start();
    }


    export function start(){
        if(!handlersIsSetUp)
            setUpControlHandlers();

        if(isRunning)
            stop();

        isRunning = true;
        

        if(playAllFrames){
            currentFrameInd = 0;
        }else{
            if(!playUntillSelected || selectedFrameId === null){
                currentFrameInd = frames.frameDeltas.length - showOnlyLast;
            }else{
                currentFrameInd = selectedFrameId + 1 - showOnlyLast;
            }
        }

        if(currentFrameInd < 0){
            currentFrameInd = 0;
        }

        next();
    }

    export function stop(){
        clearTimeout(timeoutId);
        isRunning = false;
    }

    function next(){
        let framesCount = frames.frameDeltas.length;
        // In case if frame number is reduced
        if(framesCount <= currentFrameInd){
            currentFrameInd = framesCount - 1;
        }

        RTools.showFrame(frames, currentFrameInd);

        currentFrameInd++;

        if(  currentFrameInd >= framesCount || 
            ( selectedFrameId !== null &&  
              playUntillSelected &&
              currentFrameInd >= (selectedFrameId+1))
        ){
            if(playAllFrames){
                currentFrameInd = 0;
            }else{

                if(!playUntillSelected || selectedFrameId === null){
                    currentFrameInd = framesCount - showOnlyLast;
                }else{
                    currentFrameInd = selectedFrameId + 1 - showOnlyLast;
                }

                if(currentFrameInd < 0){
                    currentFrameInd = 0;
                }

            }
        }

        timeoutId = setTimeout(next, timeInterval);
    }

    function setUpControlHandlers(){
        handlersIsSetUp = true;

        function btnHandler(num){
            return function(e){
                playAllFrames = false;
                showOnlyLast = num;
                html.animPreviewControls.frameNumInput.valueAsNumber = num;
                stop();
                start();
            }
        }

        html.animPreviewControls.showLast.onclick = btnHandler(1);
        html.animPreviewControls.showLast2.onclick = btnHandler(2);
        html.animPreviewControls.showLast3.onclick = btnHandler(3);

        html.animPreviewControls.showAll.onclick = () => {
            html.animPreviewControls.frameNumInput.value = '';
            playAllFrames = true;
            stop();
            start();
        }

        html.animPreviewControls.frameNumInput.oninput = function(evt: Event){
            let input: HTMLInputElement = <any>evt.target;
            let val = input.valueAsNumber;
            
            if(val > 0 ){
                playAllFrames = false;
                showOnlyLast = val;
            }
        }

        html.animPreviewControls.untillSelectedCheckbox.oninput = (e: any) => {
            playUntillSelected = e.target.checked;
            stop();
            start();
        }

        
        // Time interval controls handler
        function timeIntervalHandler(direction){
            const coef = 1.2;
            let step = 50;

            let nextInterval = direction == 'up' ? timeInterval*coef : timeInterval/coef;

            if(direction == 'up' &&  timeInterval > 2500){
                return
            }

            step = [50,25,10,5].find((step) => {
                if(direction == 'down'){
                    return timeInterval-nextInterval > step;
                }else{
                    return nextInterval-timeInterval > step;
                }
            })

            //debugger;

            if(step === undefined){
                return;
            }


            nextInterval = Math.round(nextInterval / step) * step;
            timeInterval = nextInterval == timeInterval ? timeInterval + 5 : nextInterval;
            html.animPreviewControls.intervalDisplay.innerHTML = String(timeInterval);
        }

        html.animPreviewControls.intervalDecrBtn.onclick = 
            timeIntervalHandler.bind(null,'down');
        html.animPreviewControls.intervalIncrBtn.onclick = 
            timeIntervalHandler.bind(null,'up');
    }

}