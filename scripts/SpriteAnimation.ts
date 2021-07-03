type Frames = {
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

// see method: addedFramesPreview()
type TempFrame = {
    frames: number, lastX: number, lastY: number,
    shiftX: number, shiftY: number,
    stickToAxis: boolean
};

class SpriteAnimation{

    frames: Frames = {
        baseBox: {
            top: 0,
            left: 0,
            width: 32,
            height: 32
        },
        frameDeltas: []
    }

    constructor(
        public parent: Project, 
        public flags: EditorFlags
    ){        

        EditingTools.setAnimation(this);

        // Next Two stages should block any other actions.
        parent.flags.editing = true;

        // ajust base box position to scroll 
        this.frames.baseBox.top = this.parent.html.mainCanvasComtainer.scrollTop;

        // Animation name setting
        new Promise((resolve) => {
            EditingTools.addAnimationListElement(resolve)
        })
        // Geting base Box size and position
        .then( () => {
          return EditingTools.getBaseBoxSizesDialog(this.frames);
        })
        .then(
            () => this.frameEditingMode()
        )
    }

  
    
    /* CHANGE THIS STUPID NAME */
    /*
     *  On first call or after call width 'update = true' parameters
     *  'frameNum' and 'stickToAxis' should be specified. After that
     *  'stickToAxis' will keep it's value and 'frameNum' could be
     *  set as -1 which means: no changes.
     *  For parameters 'xPos' and 'yPos', just call it with current
     *  event.clientX and event.clientY or set xPos and yPos to -1 
     *  when there is no mouse changes. 
     */
    addedFramesPreview(
        frameNum: number,
        xPos:number, 
        yPos:number, 
        stickToAxis: boolean = true,
        update: boolean = false
        ): void
    {
 
        let fd = this.frames.frameDeltas;
        let temp: TempFrame = (<any>this.addedFramesPreview).temp;

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
            (<any>this.addedFramesPreview).temp = temp;
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


        /* If stick to axis checkpoint: choose bigger shift */
        let xShift = !temp.stickToAxis || 
            (Math.abs(temp.shiftX) >= Math.abs(temp.shiftY)) ? temp.shiftX : 0;
        let yShift = !temp.stickToAxis || 
            (Math.abs(temp.shiftX) <  Math.abs(temp.shiftY)) ? temp.shiftY : 0;

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
            (<any>this.addedFramesPreview).temp = null;
        }

        RTools.drawFrameBoxes(this.frames);
    }


    /* 
     * 1) Add frames
     * 2) Add or remove animations
     * 3) Setup animation preview
     */
    frameEditingMode(){ 
        this.flags.editing = false;
        this.flags.frameEditingMode = true;
        
        this.frameEditingMode_();
    }  

    frameEditingMode_() : void{
        const html = this.parent.html;

        html.frameEditorBlock.container.classList.remove('hide');

        document.body.onkeydown = (e: KeyboardEvent) => {
            if(e.key == 'a'){

                if(this.flags.editing)
                    return;

                this.flags.editing = true;
                this.flags.framesMassPosotioning = true;

                let stickToAxis = html.frameEditorBlock.frameAdder.stickToAxisCheckout.checked;
                this.addedFramesPreview(1,-1,-1,stickToAxis);

                //document.body.onkeydown = null;

                document.body.onmousemove = (e: MouseEvent) => {
                    this.addedFramesPreview(-1,e.clientX,e.clientY,true);
                }

                document.body.onmousedown = () => {
                    this.addedFramesPreview(-1,-1,-1,true,true);
                    document.body.onmousemove = null;
                    this.flags.editing = false;
                    this.flags.framesMassPosotioning = false;
                }
            }

            if(this.flags.framesMassPosotioning){

                let num = parseInt(e.key);
                if(num != NaN && num > -1)
                    this.addedFramesPreview(num,-1,-1);

                if(e.key == "Escape" ){
                    this.addedFramesPreview(0,-1,-1,true,true);
                    document.body.onmousemove = null;
                    this.flags.editing = false;
                    this.flags.framesMassPosotioning = false;
                }
            }

        }


    }


    registerListItem(listItem: HTMLElement){
        this.parent.registerAnimation(listItem, this);
    }

    selectAsCurrent(){
        EditingTools.setAnimation(this);
        RTools.drawFrameBoxes(this.frames);

        this.frameEditingMode();
    }

    /* Clean up when animation deleted */
    selfDestruct(){

    }
}