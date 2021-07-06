
namespace EditingTools{

let curProject: Project = null;
let html: DomWalker; 
let flags: EditorFlags;
let curAnimation: SpriteAnimation | null = null;

export let canvasScale = 1.0;
let scaleHandlerIsSet = false;


/* Call this two before any other functons. */
export function setProject(project: Project){
    curProject = project;
    html = project.html;
    flags = project.flags;

    if(!scaleHandlerIsSet)
        setScaleHandler();
}
export function setAnimation(spriteAnimation: SpriteAnimation){
    curAnimation = spriteAnimation;
}


/* Scale handler */
function setScaleHandler(){
    scaleHandlerIsSet = true;

    html.scaleControlInput.oninput = function(evt){
        let val = (<HTMLInputElement>evt.target).valueAsNumber;

        if(!val || val < 10 || val > 6400)
            return;

        let scale = (val / 100.0);
        let oldScale = 1 / canvasScale;

        canvasScale = 1 / scale;
        html.mainCanvas.style.setProperty("transform","scale(" + scale + ")");
        // Adjust scroll position 
        let scrollCont = html.mainCanvasComtainer;
        scrollCont.scrollTop *= scale / oldScale;
        scrollCont.scrollLeft *= scale / oldScale;
    }
}

function getSpriteCordsFromEvt(evt: MouseEvent){
    let rect = html.mainCanvas.getBoundingClientRect();

    let x = (evt.clientX - rect.left) * canvasScale - RTools.canvasPadding;
    let y = (evt.clientY - rect.top ) * canvasScale - RTools.canvasPadding;

    return {x, y}
}   
function getAboluteFramePosition(ind: number){
    let x = curAnimation.frames.baseBox.left;
    let y = curAnimation.frames.baseBox.top;
    let fd = curAnimation.frames.frameDeltas;

    for(let i = 0; i <= ind; i++){
        x += fd[i].xShift;
        y += fd[i].yShift;
    }

    return {x,y}
}


/*
 * Note: All stages below should be independent of each other 
 */

/*******************************************************************************
 *   Name Editing stage. 
 *******************************************************************************/

export function addAnimationListElement(nextStage: Function){
    /* Click to element other than editing field will finish editing */ 

    /* HTML elements generation */
    let el = document.createElement('div');
    let input = document.createElement('input');
    let nameField = document.createElement('div');
    let closer = document.createElement('div');

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
    html.animListContainer.appendChild(el);

    input.focus();

    curAnimation.registerAnimation(el);


    /* Click Handlers */

    /* End name editing event */
    document.body.onclick = (e) => {

        // Click other then name input will end editing
        if(e.target == input)
            return;

        let animationName = input.value ? input.value : 'Animation';
        nameField.innerHTML = animationName;
        input.style.display = 'none';
        nameField.style.display = 'block';

        curAnimation.frames.animationName = animationName;
        
        /* End name editing */
        document.body.onclick = null;

        curProject.prohibitEditing();
        setTimeout(() => nextStage(),4);
    }


    const currentAnimation = curAnimation;

    /* Selection animation event */
    el.onclick = (e: any) =>{
        if(flags.editing)
            return;
        // Don't listen to close button dude
        if(e.target == closer)
            return;

        currentAnimation.selectAsCurrent();
    }

    /* Removing animation event */
    closer.onclick = () =>{
        if(flags.editing)
            return;
        
        html.animListContainer.removeChild(el);
        curProject.removeAnimation(currentAnimation);
    }

}


/********************************************************************************
 *    Base box set up stage
 ********************************************************************************/

export function getBaseBoxSizesDialog(frames: Frames): Promise<void>{
    
    html.baseBoxDialog.container.style.display = 'block';
    html.baseBoxDialog.widthInput.focus();

    RTools.drawFrameBoxes(frames);
    RTools.showFrame(frames,0);

    /* Handlers */
    html.baseBoxDialog.widthInput.oninput = getBaseBoxInputHandler(frames,'width');
    html.baseBoxDialog.heightInput.oninput = getBaseBoxInputHandler(frames, 'height');

    /* Show resize draging indicator. */
    html.mainCanvas.addEventListener("mousemove", dragingIdicator);

    /* Draging */
    html.mainCanvas.onmousedown = getDragingOnMouseDownHandler(frames);

    /* Finish */
    return new Promise<void>(
        function(resolve, reject){
            let baseBoxSet = getBaseBoxIsSetHandler(resolve,dragingIdicator);
            html.baseBoxDialog.button.onclick = baseBoxSet;
            document.onkeydown = (e) =>{
                if(e.key == 'Enter')
                    baseBoxSet();
            }
        }
    );

    function dragingIdicator(evt){
        let frameRect = frames.baseBox;

        let cords = getSpriteCordsFromEvt(evt);

        if(
            // Inside base box
           (cords.x  >= frameRect.left  &&
            cords.y  >= frameRect.top  &&
            cords.x  <= frameRect.left + frameRect.width  &&
            cords.y  <= frameRect.top + frameRect.height) 
            ||
            // Farther than 4 px from box
            cords.x + 4 < frameRect.left  ||
            cords.y + 4 < frameRect.top  ||
            cords.x - 4 > frameRect.left + frameRect.width  ||
            cords.y - 4 > frameRect.top + frameRect.height
        ){
            html.mainCanvas.style.cursor = "";
            return;
        }

        html.mainCanvas.style.cursor = "pointer";
    }
}

function getBaseBoxInputHandler(frames: Frames, direction: string){

    /* Handlers */
    function baseBoxResize(
        input: HTMLInputElement,
        property: string): void
    {

        let value = input.valueAsNumber;

        if(value < 8)
            return;
        if(value > 10000){
            value = 10000;
            input.value = '10000';
        }

        frames.baseBox[property] = value;

        RTools.drawFrameBoxes(frames);
        RTools.showFrame(frames,0);
    }

    if(direction === 'width'){
        return  () => {
            baseBoxResize(html.baseBoxDialog.widthInput,'width');
        }
    }

    if(direction === 'height'){
        return () => {
        baseBoxResize(html.baseBoxDialog.heightInput,'height');
        }
    }
}

function getDragingOnMouseDownHandler(frames: Frames){
    /* To keep closer it in memory */
    let {spriteWidth} = curProject;
    let {spriteHeight} = curProject;

    let func =  (evt) => 
    {
        if(flags.baseBoxDraging || flags.baseBoxResizeDraging)
            return;


        let frameRect = frames.baseBox;
        let cords = getSpriteCordsFromEvt(evt);

        /* Track where click relative to box */
        let toLeft  = (cords.x < frameRect.left);
        let above   = (cords.y - 10 < frameRect.top);
        let toRight = (cords.x > frameRect.left + frameRect.width);
        let below   = (cords.y > frameRect.top + frameRect.height);

        if( toLeft || above || toRight || below ){
            if(html.mainCanvas.style.cursor == "pointer"){
                resizeDraging(evt, { 
                    left: toLeft,
                    top: above,
                    right: toRight,
                    bottom: below
                 });
            }
            
            return;
        }

        flags.baseBoxDraging = true;

        let lastX = evt.x * canvasScale;
        let lastY = evt.y * canvasScale;


        document.onmousemove = (evt) => {
            let e = {
                x : evt.clientX * canvasScale, 
                y: evt.clientY * canvasScale
            };
            let {baseBox} = frames;
            
            baseBox.left += e.x - lastX;
            baseBox.top += e.y - lastY;
            lastX = e.x;
            lastY = e.y

            /* Once it out, you wont be able to grub it. */
            if(baseBox.left < 0) 
                baseBox.left = 0;
            if(baseBox.top < 0) 
                baseBox.top = 0;
            if(baseBox.left + baseBox.width > spriteWidth + 5) 
                baseBox.left = spriteWidth - baseBox.width + 5;
            if(baseBox.top + baseBox.height > spriteHeight + 5) 
                baseBox.top = spriteHeight - baseBox.height + 5;

            RTools.drawFrameBoxes(frames);
            RTools.showFrame(frames,0);
        }

        document.onmouseup = () => { 
            document.onmousemove = null;
            document.onmouseup = null;
            flags.baseBoxDraging = false;
        }
    }

    function resizeDraging(
        evt: MouseEvent, 
        side : { left: boolean, top: boolean,right: boolean,bottom: boolean})
    {
        flags.baseBoxResizeDraging = true;

        let lastX = evt.clientX * canvasScale;
        let lastY = evt.clientY * canvasScale;

        document.onmousemove = (evt) => {
            let e = {
                x : evt.clientX * canvasScale, 
                y: evt.clientY * canvasScale
            };
            let box = frames.baseBox;

            if(side.top){
                box.top    += e.y - lastY;
                box.height -= e.y - lastY;
            }
            if(side.bottom){
                box.height += e.y -lastY;
            }
            if(side.left){
                box.left   += e.x - lastX;
                box.width  -= e.x - lastX;
            }
            if(side.right){
                box.width  += e.x - lastX;
            }


            lastX = e.x;
            lastY = e.y;

            html.baseBoxDialog.widthInput.value = "" + Math.round(box.width);
            html.baseBoxDialog.heightInput.value = "" + Math.round(box.height);

            RTools.drawFrameBoxes(frames);
            RTools.showFrame(frames,0);
        }

        document.onmouseup = () => { 
            document.onmousemove = null;
            document.onmouseup = null;
            flags.baseBoxResizeDraging = false;
        }
    }

    return func;
}

function getBaseBoxIsSetHandler(nextStage: Function, dragingIdicator){

    let baseBoxSet = () => {
        if(flags.baseBoxDraging)
            return;

        // Clean up event handlers
        html.mainCanvas.removeEventListener('mousemove',dragingIdicator);
        html.mainCanvas.onmousedown = null;
        html.baseBoxDialog.widthInput.oninput = null;
        html.baseBoxDialog.heightInput.oninput = null;
        html.baseBoxDialog.button.onclick = null;
        document.onkeydown = null;
        
        flags.baseBoxEditing = false;
        
        html.baseBoxDialog.container.style.display = 'none';

        // Round numbers
        let box = curAnimation.frames.baseBox;
        box.top = Math.round(box.top);
        box.left = Math.round(box.left);
        box.width = Math.round(box.width);
        box.height = Math.round(box.height);

        setTimeout(() => nextStage() ,4);
    }

    return baseBoxSet;
}


/********************************************************************************
 *  Frame addition handler
 */
function frameEditorBlockSetStage(num: number){
    if(num == 1){
        html.frameEditorBlock.frameAdder.stage1.classList.remove("hide");
        html.frameEditorBlock.frameAdder.stage2.classList.add("hide");
    }else{
        html.frameEditorBlock.frameAdder.stage1.classList.add("hide");
        html.frameEditorBlock.frameAdder.stage2.classList.remove("hide");
    }
}

export function getFrameAdderHandler(){
    
    return function(e: KeyboardEvent): any{
        
        if(e.key == 'a'){

            if(curProject.flags.editing)
                return;

            curProject.prohibitEditing();
            flags.framesMassPosotioning = true;

            // Bottom panel 
            frameEditorBlockSetStage(2);

            let stickToAxis = html.frameEditorBlock.frameAdder.stickToAxisCheckout.checked;
            curAnimation.stateBasedFrameAdder(1,-1,-1,stickToAxis);

            document.body.onmousemove = (e: MouseEvent) => {
                let x = e.clientX * canvasScale;
                let y = e.clientY * canvasScale;
                curAnimation.stateBasedFrameAdder(-1,x,y,true);
            }

            // Finish and clean
            document.body.onmousedown = (e) => {
                curAnimation.stateBasedFrameAdder(-1,-1,-1,true,true);
                cleanUp();
            }
        }

        if(flags.framesMassPosotioning){

            let num = parseInt(e.key);
            if(num != NaN && num > -1)
                curAnimation.stateBasedFrameAdder(num,-1,-1);

            if(e.key == "Escape" ){
                curAnimation.stateBasedFrameAdder(0,-1,-1,true,true);
                cleanUp();
            }
        }

        function cleanUp(){
            document.body.onmousemove = null;
            document.body.onmousedown = null;
            frameEditorBlockSetStage(1);
            flags.framesMassPosotioning = false;
            curProject.alowEditing();
        }

    }


}


/***********************************************************
 * Frame selection:  
 *    Then:
 *      1) Frame deleting
 *      2) Frame displacement
 *      3) Frame crop border draging
 */
 type SelectedFrameHandlers = {
    keyDown: (evt: KeyboardEvent) => void,
    cursorIndicator: (evt: MouseEvent) => void, 
    cropDragStart: (evt: MouseEvent) => boolean,
    cropDrag: (evt: MouseEvent) => void
}
let selectedFrameHandlers: SelectedFrameHandlers = <any>{};
let selectedFramelastHoveredSide;
let selectedFrameIndex = -1;

export function getFrameSelectionHandler(){

    return function(evt: MouseEvent): void{
        let selectedInd: number;

        if( flags.cropFrameDrag)
            return;

        /* When selected:
        /*  1) See if crop draging, else
         *  2) If clicked other place then unselect, else
         *  2) See if new selection
         */
        if(flags.frameSelected){
            if(selectedFrameHandlers.cropDragStart(evt))
                return;

            selectedInd = findSelectedFrameIndex(evt);
            if(selectedInd == -1){
                selectedFrameStateExit();
                RTools.drawFrameBoxes(curAnimation.frames, selectedInd);
                return;
            }
            if(selectedInd == selectedFrameIndex){
                return;
            }

            selectedFrameIndex = selectedInd;
            selectedFrameRemoveHandlers();
            selectedSetHandlers(selectedInd);
            RTools.drawFrameBoxes(curAnimation.frames, selectedInd);
            return;
        }

        if(flags.editing)
            return;

        curProject.prohibitEditing();

        selectedInd = findSelectedFrameIndex(evt);
        selectedFrameIndex = selectedInd;

        if(selectedInd == -1){
            curProject.alowEditing();
            return;
        }

        RTools.drawFrameBoxes(curAnimation.frames, selectedInd);
        selectedSetHandlers(selectedInd);
        flags.frameSelected = true;
    }

}

function selectedFrameStateExit(){
    selectedFrameRemoveHandlers();
    flags.frameSelected = false;
    curProject.alowEditing();
}
function selectedSetHandlers(selectedInd: number){
    selectedFrameHandlers.keyDown = getSelectedFrameKeyHandler(selectedInd);
    document.body.addEventListener("keydown",
        selectedFrameHandlers.keyDown
    );

    selectedFrameHandlers.cursorIndicator = 
        getSelectedFrameIndicatorHandler(selectedInd);
    document.body.addEventListener("mousemove",
        selectedFrameHandlers.cursorIndicator
    );

    selectedFrameHandlers.cropDragStart = getSelectedFrameDragStart(selectedInd);

}
function selectedFrameRemoveHandlers(){
    document.body.removeEventListener("keydown",
        selectedFrameHandlers.keyDown
    );
    document.body.removeEventListener("mousemove",
        selectedFrameHandlers.cursorIndicator
    );
}

function getSelectedFrameDragStart(ind: number){
    return function(evt: MouseEvent){
        if(html.mainCanvas.style.cursor != "pointer")
            return false;


        flags.cropFrameDrag = true;

        let lastX = evt.clientX * canvasScale;
        let lastY = evt.clientY * canvasScale;
        let side = selectedFramelastHoveredSide;

        selectedFrameHandlers.cropDrag = (evt: MouseEvent) =>{
            let {crop} = curAnimation.frames.frameDeltas[ind];
            let {baseBox} = curAnimation.frames;
            let x = evt.clientX * canvasScale;
            let y = evt.clientY * canvasScale;

            if(side.left){
                crop.left += x - lastX;
                // Restrain out
                crop.left = crop.left < 0 ? 0 : crop.left;
                // Restrain min size 4
                if(crop.left+crop.right>= baseBox.width)
                    crop.left = baseBox.width - crop.right -4;
            }
            if(side.up){
                crop.top += y - lastY;
                crop.top = crop.top < 0 ? 0 : crop.top;

                if(crop.top+crop.bottom>= baseBox.height)
                    crop.top = baseBox.height - crop.bottom - 4;
            }
            if(side.right){
                crop.right -= x - lastX;
                crop.right = crop.right < 0 ? 0 : crop.right;

                if(crop.left+crop.right>= baseBox.width)
                    crop.left = baseBox.width - crop.left -4;
            }
            if(side.bottom){
                crop.bottom -= y - lastY;
                crop.bottom = crop.bottom < 0 ? 0 : crop.bottom;

                if(crop.top+crop.bottom>= baseBox.height)
                    crop.bottom = baseBox.height - crop.top - 4;
            }
            

            lastX = x; 
            lastY = y;

            RTools.drawFrameBoxes(curAnimation.frames, ind);
        }

        document.addEventListener("mousemove", 
            selectedFrameHandlers.cropDrag);

        function endDrag(){
            document.removeEventListener("mousemove",
                selectedFrameHandlers.cropDrag);
            document.removeEventListener("mouseup",
                endDrag
            );
            flags.cropFrameDrag = false;
        }
        document.addEventListener("mouseup", 
            endDrag);


        return true;
    }
}


function getSelectedFrameIndicatorHandler(ind){
    return function(evt){
        let cords = getSpriteCordsFromEvt(evt);
        let topLeft = getAboluteFramePosition(ind);
        let base = curAnimation.frames.baseBox;
        let {crop} = curAnimation.frames.frameDeltas[ind];

        // Crop border hover checkout
        let isLeft  = cords.x > topLeft.x + crop.left;
        let isRight = cords.x < topLeft.x + base.width  - crop.right;
        let isUp    = cords.y > topLeft.y + crop.top;
        let isBotom = cords.y < topLeft.y + base.height - crop.bottom;
        let isLeftOuter = cords.x + 3 <= topLeft.x + crop.left;
        let isRightOuter = cords.x - 3 >= topLeft.x + base.width  - crop.right;
        let isUpOuter = cords.y + 3 <= topLeft.y + crop.top;
        let isBotomOuter = cords.y - 3 >= topLeft.y + base.height - crop.bottom;

        if(    (isLeft && isRight && isUp && isBotom) // is inside
            || isLeftOuter || isRightOuter || isUpOuter || isBotomOuter
        )
        {
            html.mainCanvas.style.cursor = "";
        }
        else{
            html.mainCanvas.style.cursor = "pointer";
            selectedFramelastHoveredSide = {
                left: !isLeft, 
                right: !isRight, 
                up: !isUp, 
                bottom: !isBotom
            }
        }
    }
}


function getSelectedFrameKeyHandler(ind: number){
    return function(evt: KeyboardEvent){
        
        switch(evt.key){
            case "Enter":
            case "Escape":
                selectedFrameStateExit();
                break;
            case "Delete":
                selectedFrameRemove(ind);
                selectedFrameStateExit();
                break;
            default:
                if(evt.key.search("Arrow") == 0){
                    selectedFrameMove(ind, evt.key);
                    evt.preventDefault();
                    RTools.drawFrameBoxes(curAnimation.frames,ind);
                    return;
                }
        }

        RTools.drawFrameBoxes(curAnimation.frames);
    }
}

function selectedFrameMove(ind: number, direction: string){
    let fd = curAnimation.frames.frameDeltas;

    let notLast = fd.length > ind + 1;
    let next = notLast ? fd[ind+1] : null;

    switch(direction){
        case "ArrowUp":
            fd[ind].yShift--;
            notLast && next.yShift++;
            break;
        case "ArrowRight":
            fd[ind].xShift++;
            notLast && next.xShift--;
            break;
        case "ArrowDown":
            fd[ind].yShift++;
            notLast && next.yShift--;
            break;
        case "ArrowLeft":
            fd[ind].xShift--;
            notLast && next.xShift++;
            break;
    }

}


function selectedFrameRemove(ind: number){
    if(ind < 0)
        return;

    curAnimation.frames.frameDeltas = 
        curAnimation.frames.frameDeltas.slice(0,ind);
}

/* If posible to select two and more frames
 * than select least recently added one. Croped parts 
 * are not selected. */
function findSelectedFrameIndex(evt: MouseEvent){
    let cords = getSpriteCordsFromEvt(evt);
    let {frames} = curAnimation;
    let fd = frames.frameDeltas;

    // Must always loop all array here. Penalty for stupidly using relative cords.
    let x = frames.baseBox.left;
    let y = frames.baseBox.top;
    let {width, height} = frames.baseBox;

    let lastInd = -1;
    for(let i = 0; i < fd.length; i++){
        let {crop} = fd[i];

        x += fd[i].xShift;
        y += fd[i].yShift;

        if( cords.x < x + crop.left ||
            cords.y < y + crop.top  ||
            cords.x > x - crop.right  + width  ||
            cords.y > y - crop.bottom + height
            )
            continue;

        lastInd = i;
        
    }

    return lastInd;
}

}