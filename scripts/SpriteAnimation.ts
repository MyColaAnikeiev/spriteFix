type Frames = {
    baseBox :{
        top: number;
        left: number;
        width: number;
        height: number;
    };
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
    
    parent: Project;
    container: HTMLElement;
    listElement : HTMLElement;
    flags: EditorFlags;

    

    frames: Frames = {
        baseBox: {
            top: 0,
            left: 0,
            width: 32,
            height: 32
        },
        frameDeltas: []
    }

    constructor(parent: Project, container: HTMLElement, flags: EditorFlags){
        this.container = container;
        this.flags = flags;
        this.parent = parent;

        this.addListElement();
    }

    addListElement(){
        /* Click to element other than editing field will finish editing */ 
        this.flags.editing = true;

        /* HTML elements generation */
        let el = document.createElement('div');
        let input = document.createElement('input');
        let nameField = document.createElement('div');
        let closer = document.createElement('div');
        
        this.listElement = el;

        el.className = 'anim-list-item';
        input.type = 'txt';
        input.placeholder = 'Animation name';
        nameField.style.display = 'none';
        nameField.className = 'anim-name'
        closer.className = 'closer';
        closer.innerHTML = "close";

        el.appendChild(input);
        el.appendChild(nameField);
        el.appendChild(closer);
        this.container.appendChild(el);

        input.focus();


        /* Click Handlers */

        /* End name editing event */
        document.body.onclick = (e) => {

            if(e.target == input)
                return;

            nameField.innerHTML = input.value ? input.value : 'Animation';
            input.style.display = 'none';
            nameField.style.display = 'block';
            
            /* End name editing */
            document.body.onclick = null;
            //this.flags.editing = false;      

            setTimeout(() => this.getBaseBoxSizesDialog(),4);
        }


        /* Removing animation event */
        closer.onclick = () =>{
            if(this.flags.editing)
                return;
            
            this.container.removeChild(this.listElement);
            this.parent.removeAnimation(this);
        }

    }

    getBaseBoxSizesDialog(){
        let html = this.parent.html;

        this.flags.editing = true;
        this.flags.baseBoxEditing = true;
        html.baseBoxDialog.container.style.display = 'block';
        html.baseBoxDialog.widthInput.focus();

        RTools.drawFrameBoxes(this.frames);
        RTools.showFrame(this.frames,0);


        /* Handlers */
        html.baseBoxDialog.widthInput.oninput = this.getBaseBoxResizeHandler('width');
        html.baseBoxDialog.heightInput.oninput = this.getBaseBoxResizeHandler('height');

        /* Draging */
        html.mainCanvas.onmousedown = this.getDragingOnMouseDownHandler();

        /* Finish */
        let baseBoxSet = this.getBaseBoxIsSetHandler();
        html.baseBoxDialog.button.onclick = baseBoxSet;
        document.onkeydown = (e) =>{
            if(e.key == 'Enter')
                baseBoxSet();
        }
        
    }

    getBaseBoxResizeHandler(direction: string){
        let html = this.parent.html;

        /* Handlers */
        function baseBoxResize(
            spriteAnim: SpriteAnimation,
            input: HTMLInputElement,
            property: string): void
        {
            if(!spriteAnim.flags.baseBoxEditing)
                return;

            let value = input.valueAsNumber;

            if(value < 8)
                return;
            if(value > 10000)
                input.value = '10000';

            spriteAnim.frames.baseBox[property] = value;

            RTools.drawFrameBoxes(spriteAnim.frames);
            RTools.showFrame(spriteAnim.frames,0);
        }

        if(direction === 'width'){
            return  () => {
                baseBoxResize(this, html.baseBoxDialog.widthInput,'width');
            }
        }

        if(direction === 'height'){
            return () => {
            baseBoxResize(this, html.baseBoxDialog.heightInput,'height');
            }
        }

        throw new Error("Expecting width or height.");
    }

    getDragingOnMouseDownHandler() : (e:Event) => void{
        /* To keep it in memory */
        let {spriteWidth} = this.parent;
        let {spriteHeight} = this.parent;
        let {html} = this.parent;

        let func =  (e) => 
        {
            if(!this.flags.baseBoxEditing || this.flags.baseBoxDraging)
                return;

            /* Drag only base frame */
            let canvRect = html.mainCanvas.getBoundingClientRect();
            let frameRect = this.frames.baseBox;
            if(
                e.x - canvRect.left - 10 < frameRect.left  ||
                e.y - canvRect.top - 10 < frameRect.top  ||
                e.x - canvRect.left - 10 > frameRect.left + frameRect.width  ||
                e.y - canvRect.top - 10 > frameRect.top + frameRect.height
            )
                return;

            let lastX = e.clientX;
            let lastY = e.clientY;

            this.flags.baseBoxDraging = true;

            document.onmousemove = (e) => {
                let {baseBox} = this.frames
                
                baseBox.left += e.x - lastX;
                baseBox.top += e.y - lastY;
                lastX = e.x;
                lastY = e.y

                /* Once it out, you wont be able to grub it. */
                if(baseBox.left < 0) baseBox.left = 0;
                if(baseBox.top < 0) baseBox.top = 0;
                if(baseBox.left + baseBox.width > spriteWidth + 5) 
                    baseBox.left = spriteWidth - baseBox.width + 5;
                if(baseBox.top + baseBox.height > spriteHeight + 5) 
                    baseBox.top = spriteHeight - baseBox.height + 5;

                RTools.drawFrameBoxes(this.frames);
                RTools.showFrame(this.frames,0);
            }

            document.onmouseup = () => { 
                document.onmousemove = null;
                document.onmouseup = null;
                this.flags.baseBoxDraging = false;
            }
        }

        return func;
    }

    getBaseBoxIsSetHandler(){
        let html = this.parent.html;

        let baseBoxSet = () => {
            if(this.flags.baseBoxDraging)
                return;

            html.mainCanvas.onmousedown = null;
            html.baseBoxDialog.widthInput.oninput = null;
            html.baseBoxDialog.heightInput.oninput = null;
            html.baseBoxDialog.button.onclick = null;
            document.onkeydown = null;
            
            this.flags.baseBoxEditing = false;
            this.flags.editing = false;
            
            html.baseBoxDialog.container.style.display = 'none';


            setTimeout(() => this.setAnimationEditingMode(),4);
        }

        return baseBoxSet;
    }

    
    /* CHANGE THIS STUPID NAME */
    /*
     * All parameters except 'update' will only temporaly change 
     * last frames parameters and show it to canvas. To finaly add 
     * specified frames last argument should be true.
     * argument 'stickToAxis' is accepted only when !temp == true
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
            // Half of mouse movement
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
    setAnimationEditingMode() : void{
        let html = this.parent.html;

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
}