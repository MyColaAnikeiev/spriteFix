
namespace EditingTools{

let curProject: Project = null;
let html: DomWalker; 
let flags: EditorFlags;
let curAnimation: SpriteAnimation | null = null;

/* Call this two before any other functons. */
export function setProject(project: Project, domWalker: DomWalker, editFlags: EditorFlags){
    curProject = project;
    html = domWalker;
    flags = editFlags;
}

export function setAnimation(spriteAnimation: SpriteAnimation){
    curAnimation = spriteAnimation;
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

        nameField.innerHTML = input.value ? input.value : 'Animation';
        input.style.display = 'none';
        nameField.style.display = 'block';
        
        /* End name editing */
        document.body.onclick = null;

        flags.editing = true;
        setTimeout(() => nextStage(),4);
    }


    //  Enclosure
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

    function dragingIdicator(e){
        let canvRect = html.mainCanvas.getBoundingClientRect();
        let frameRect = frames.baseBox;

        if(
            // Inside base box
           (e.x - canvRect.left - 10 >= frameRect.left  &&
            e.y - canvRect.top - 10 >= frameRect.top  &&
            e.x - canvRect.left - 10 <= frameRect.left + frameRect.width  &&
            e.y - canvRect.top - 10 <= frameRect.top + frameRect.height) 
            ||
            // Farther than 4 px from box
            e.x - canvRect.left - 6 < frameRect.left  ||
            e.y - canvRect.top - 6 < frameRect.top  ||
            e.x - canvRect.left - 14 > frameRect.left + frameRect.width  ||
            e.y - canvRect.top - 14 > frameRect.top + frameRect.height
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
    /* To keep it in memory */
    let {spriteWidth} = curProject;
    let {spriteHeight} = curProject;

    let func =  (e) => 
    {
        if(flags.baseBoxDraging || flags.baseBoxResizeDraging)
            return;
    

        let canvRect = html.mainCanvas.getBoundingClientRect();
        let frameRect = frames.baseBox;

        /* Track where click relative to box */
        let toLeft  = (e.x - canvRect.left - 10 < frameRect.left);
        let above   = (e.y - canvRect.top - 10 < frameRect.top);
        let toRight = (e.x - canvRect.left - 10 > frameRect.left + frameRect.width);
        let below   = (e.y - canvRect.top - 10 > frameRect.top + frameRect.height);

        if( toLeft || above || toRight || below ){
            if(html.mainCanvas.style.cursor == "pointer"){
                resizeDraging(e, { 
                    left: toLeft,
                    top: above,
                    right: toRight,
                    bottom: below
                 });
            }
            
            return;
        }

        flags.baseBoxDraging = true;

        let lastX = e.clientX;
        let lastY = e.clientY;


        document.onmousemove = (e) => {
            let {baseBox} = frames
            
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

        let lastX = evt.clientX;
        let lastY = evt.clientY;

        document.onmousemove = (e) => {
            let box = frames.baseBox;

            if(side.top){
                box.top += e.clientY - lastY;
                box.height -= e.clientY - lastY;
            }
            if(side.bottom){
                box.height += e.clientY -lastY;
            }
            if(side.left){
                box.left += e.clientX - lastX;
                box.width -= e.clientX - lastX;
            }
            if(side.right){
                box.width += e.clientX - lastX;
            }

            lastX = e.clientX;
            lastY = e.clientY;

            html.baseBoxDialog.widthInput.value = "" + box.width;
            html.baseBoxDialog.heightInput.value = "" + box.height;

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
        flags.editing = false;
        
        html.baseBoxDialog.container.style.display = 'none';


        setTimeout(() => nextStage() ,4);
    }

    return baseBoxSet;
}


/********************************************************************************
 * 
 */

export function getFrameAdderHandler(){
    
    return function(e: KeyboardEvent): any{
        
        if(e.key == 'a'){

            if(flags.editing)
                return;

            flags.editing = true;
            flags.framesMassPosotioning = true;

            let stickToAxis = html.frameEditorBlock.frameAdder.stickToAxisCheckout.checked;
            curAnimation.stateBasedFrameAdder(1,-1,-1,stickToAxis);

            //document.body.onkeydown = null;

            document.body.onmousemove = (e: MouseEvent) => {
                curAnimation.stateBasedFrameAdder(-1,e.clientX,e.clientY,true);
            }

            // Finish and clean
            document.body.onmousedown = () => {
                curAnimation.stateBasedFrameAdder(-1,-1,-1,true,true);
                document.body.onmousemove = null;
                document.body.onmousedown = null;
                flags.framesMassPosotioning = false;
                flags.editing = false;
            }
        }

        if(flags.framesMassPosotioning){

            let num = parseInt(e.key);
            if(num != NaN && num > -1)
                curAnimation.stateBasedFrameAdder(num,-1,-1);

            if(e.key == "Escape" ){
                curAnimation.stateBasedFrameAdder(0,-1,-1,true,true);
                document.body.onmousemove = null;
                flags.editing = false;
                flags.framesMassPosotioning = false;
            }
        }

    }


}


}