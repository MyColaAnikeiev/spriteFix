type Frames = {
    animationName: string,
    baseBox :{
        top: number;
        left: number;
        width: number;
        height: number;
    },

    frameDeltas: Array<{
        xShift: number;
        yShift: number;
        /* Cropping */
        crop: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        }
    }> 
};

// see method: stateBasedFrameAdder()
type TempFrame = {
    frames: number, lastX: number, lastY: number,
    shiftX: number, shiftY: number,
    stickToAxis: boolean
};


type FrameEditingModeHandlers = {
    addFrame : (evt: KeyboardEvent) => void,
    frameSelectionClick: (evt: MouseEvent) => void
};

class SpriteAnimation{

    frames: Frames = {
        animationName: '',
        baseBox: {
            top: 0,
            left: 0,
            width: 32,
            height: 32
        },
        frameDeltas: [{
            xShift: 0, yShift: 0,
            crop: {top: 0, right: 0, bottom: 0, left: 0}
        }]
    }

    flags: EditorFlags;

    handlers: FrameEditingModeHandlers;

    constructor(
        public parent: Project, 
        public isLoaded: boolean = false
    ){      

        // Next Two stages should block any other actions.
        isLoaded || this.parent.prohibitEditing();

        this.flags = this.parent.flags;

        EditingTools.setAnimation(this);
        AnimationPlayer.setAnimation(this);
        this.getHendlers();

        if(isLoaded){
            return;
        }

        // Adjust base box start position to scrollPosition so it
        // will apear where you would expect it. 
        let canvCont = this.parent.html.mainCanvasComtainer;
        this.frames.baseBox.top  = canvCont.scrollTop  * EditingTools.canvasScale;
        this.frames.baseBox.left = canvCont.scrollLeft * EditingTools.canvasScale;

        // Animation name setting stage
        new Promise((resolve) => {
            EditingTools.addAnimationListElement(resolve)
        })
        // Geting base Box size and position stage
        .then( () => {
          return EditingTools.getBaseBoxSizesDialog(this.frames);
        })
        .then(
            () => this.frameEditingMode()
        )
    }

    /* Call after 'EditingTools.setAnimation()' */
    getHendlers(){
        this.handlers = {
            addFrame: EditingTools.getFrameAdderHandler(),
            frameSelectionClick: EditingTools.getFrameSelectionHandler()
        }
    }

    /*****************************
     *  Posible actions at this stage:
     *     Global:
     *       1) Open sprite (Current project will hopefully be destroyed by gurbage collector)
     *     Project:
     *       1) Add Animation
     *       2) Select Animation
     *       3) Remove Animation
     *     Animation:
     *       1) Add frames
     */
    frameEditingMode(){ 
        const {html} = this.parent;

        this.showFrameEditorBlock();
        this.parent.alowEditing();
        this.flags.frameEditingMode = true;

        AnimationPlayer.start();

        document.body.addEventListener("keydown",this.handlers.addFrame);
        html.mainCanvas.addEventListener("mousedown",this.handlers.frameSelectionClick);
    }  

    showFrameEditorBlock(){
        const html = this.parent.html;
        html.frameEditorBlock.container.classList.remove('hide');
    }

    registerAnimation(listItem: HTMLElement){
        this.parent.registerAnimation(listItem, this);
    }

    selectAsCurrent(){
        AnimationPlayer.setAnimation(this);
        EditingTools.setAnimation(this);
        RTools.drawFrameBoxes(this.frames);

        this.frameEditingMode();
    }

    /* Clean up when animation deleted */
    selfDestruct(){
        const {html} = this.parent;

        this.flags.frameEditingMode = false;
        document.body.removeEventListener("keydown", this.handlers.addFrame);
        html.mainCanvas.removeEventListener("mousedown",this.handlers.frameSelectionClick);

        this.handlers.addFrame = null;
        this.handlers.frameSelectionClick = null;
    }




    /* 
     * Used in: 'EditingTools.getFrameAdderHandler'     
     *
     *  On first call or after call width 'update = true' parameters
     *  'frameNum' and 'stickToAxis' should be specified. After that
     *  'stickToAxis' will keep it's value and 'frameNum' could be
     *  set as -1 which means: no changes.
     *  For parameters 'xPos' and 'yPos', just call it with current
     *  event.clientX and event.clientY or set 'xPos' and 'yPos' to -1 
     *  when there is no mouse changes. 
     */
    stateBasedFrameAdder(
        frameNum: number,
        xPos:number, 
        yPos:number, 
        stickToAxis: boolean = true,
        update: boolean = false
        ): void
    {
 
        const fd = this.frames.frameDeltas;

        // Get static 'temp' object if exist or 'undefined' otherwise.
        let temp: TempFrame = (<any>this.stateBasedFrameAdder).temp;

        if(!temp && frameNum < 0)
            return;

        if(frameNum < 0)
            frameNum = temp.frames;

        if(!temp){
            temp = {
                frames: 0,
                lastX: xPos,
                lastY: yPos,
                shiftX: this.frames.baseBox.width,
                shiftY: 0,
                stickToAxis: stickToAxis
            };
            // Set static varaible
            (<any>this.stateBasedFrameAdder).temp = temp;
        }

        // If not mouse event xPos = -1
        if(xPos != -1 && temp.lastX != -1){
            temp.shiftX += (xPos - temp.lastX);
            temp.shiftY += (yPos - temp.lastY);     
            temp.lastX = xPos;
            temp.lastY = yPos;       
        }else{
            if(temp.lastX == -1 && xPos != -1){
                temp.lastX = xPos;
                temp.lastY = yPos;
            }
        }


        /* If 'stick to axis' checkpoint: choose bigger direction shift */
        let verticalIsDominant = (Math.abs(temp.shiftX) >= Math.abs(temp.shiftY));
        let xShift = !temp.stickToAxis ||  verticalIsDominant ? temp.shiftX : 0;
        let yShift = !temp.stickToAxis || !verticalIsDominant ? temp.shiftY : 0;

        // Add or remove frames from array if any changes
        if(frameNum < temp.frames){
            for(let i = 0; i < (temp.frames - frameNum); i++)
                fd.pop();
        }
        if(frameNum > temp.frames){
            /* If stick to axis checkpoint: choose bigger shift */
            for(let i = 0; i < frameNum - temp.frames; i++)
                fd.push({
                    xShift: xShift,
                    yShift: yShift,
                    crop: {
                        top: 0, right: 0, bottom: 0, left: 0
                    }
                });
        }

        // Update 'old' frames shifts if there is any.
        let ind = fd.length - frameNum;
        for(let i = 0; i < frameNum && i < temp.frames ; i++, ind++){
            fd[ind].xShift = xShift;
            fd[ind].yShift = yShift;
        }

        temp.frames = frameNum;

        if(update){
            this.roundLastFrames(frameNum);
            (<any>this.stateBasedFrameAdder).temp = null;
        }

        RTools.drawFrameBoxes(this.frames);
    }

    // Prevent pixel jumping
    roundLastFrames(num){
        let fd = this.frames.frameDeltas;
        let fLen =  fd.length;
        let ind = fLen - num;

        let remainX = 0.0;
        let remainY = 0.0;
        
        for(; ind < fLen; ind++){
            let remainNewX = remainX + fd[ind].xShift - Math.round(fd[ind].xShift + remainX);
            let remainNewY = remainY + fd[ind].yShift - Math.round(fd[ind].yShift + remainY);

            fd[ind].xShift = Math.round(fd[ind].xShift + remainX);
            fd[ind].yShift = Math.round(fd[ind].yShift + remainY);
            remainX = remainNewX;
            remainY = remainNewY;
        }
    }

}