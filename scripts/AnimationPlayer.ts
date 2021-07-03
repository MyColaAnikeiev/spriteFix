namespace AnimationPlayer{
    let frames: Frames;
    let flags: EditorFlags;
    let html: DomWalker;

    export function setProject(pg: Project){
        flags = pg.flags;
        html = pg.html;
    }
    export function setAnimation(anim: SpriteAnimation){
        frames = anim.frames;
    }


    let isRunning = false;
    let intervalId: number;
    let showOnlyLast = 5;
    let currentFrameInd = 0;

    export function start(){
        if(isRunning)
            stop();

        isRunning = true;
        intervalId = setInterval(next, 300);

        currentFrameInd = frames.frameDeltas.length - showOnlyLast;
        if(currentFrameInd < 0)
            currentFrameInd = 0;
    }

    export function stop(){
        clearInterval(intervalId);
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
        if(currentFrameInd >= framesCount){
            currentFrameInd = framesCount - showOnlyLast;
            if(currentFrameInd < 0){
                currentFrameInd = 0;
            }
        }
    }

}