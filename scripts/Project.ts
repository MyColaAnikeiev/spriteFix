type EditorFlags = {
    editing: boolean,
    baseBoxEditing: boolean,
    baseBoxResizeDraging: boolean,
    baseBoxDraging: boolean,
    framesMassPosotioning: boolean,
    frameEditingMode: boolean,
    frameSelected: boolean,
    cropFrameDrag: boolean
}

type DomWalker = {
    dragMenu: {
        saveJson: HTMLElement;
        openJson: HTMLElement;
        exportSprite: HTMLElement;
    }
    mainCanvasComtainer: HTMLElement;
    mainCanvas: HTMLCanvasElement;
    addAnimationBtn: HTMLElement;  
    animListContainer: HTMLElement;
    baseBoxDialog: {
        container: HTMLElement;
        widthInput: HTMLInputElement;
        heightInput: HTMLInputElement;
        button: HTMLElement;
    };
    frameEditorBlock: {
        container: HTMLElement;
        frameAdder: {
            stage1: HTMLElement;
            stage2: HTMLElement;
            container: HTMLElement;
            stickToAxisCheckout: HTMLInputElement;
            selectedNumber: HTMLElement;
        }
    }
    animPreviewControls: {
        frameNumInput: HTMLInputElement;
        showLast: HTMLElement;
        showLast2: HTMLElement;
        showLast3: HTMLElement;
        showAll: HTMLElement;
    },
    scaleControlInput: HTMLInputElement;
};

/* New project is started when user opens Sprite */
class Project{

    animations: Map<SpriteAnimation, HTMLElement> = new Map();
    selectedAnimation: SpriteAnimation | null = null;

    /* Editing state machine flags */
    flags: EditorFlags = {
        editing: false,
        baseBoxEditing: false,
        baseBoxResizeDraging: false,
        baseBoxDraging: false,
        framesMassPosotioning: false,
        frameEditingMode: false,
        frameSelected: false,
        cropFrameDrag: false
    }

    html: DomWalker;

    img: HTMLImageElement;
    spriteWidth: number;
    spriteHeight:number;


    constructor(img : HTMLImageElement){
        this.spriteWidth = img.width;
        this.spriteHeight = img.height;
        this.img = img;

        RTools.setImg(img);
        RTools.drawImage();

        this.grubDomElements();
        this.resetDom();
        this.setListeners();

        EditingTools.setProject(this);
        AnimationPlayer.setProject(this);
    }

    alowEditing(){
        // Temporaly work around
        setTimeout(() => this.flags.editing = false, 150);
    }
    prohibitEditing(){
        this.flags.editing = true;
    }

    grubDomElements(){
        let query = (str) => document.querySelector(str);
        let byId =  (str) => document.getElementById(str);

        this.html = {
            dragMenu: {
                saveJson: byId("save-json-btn"),
                openJson: byId("open-json-btn"),
                exportSprite: byId("export-sprite-btn")
            },
            mainCanvasComtainer: byId("source_view_container"),
            mainCanvas: <HTMLCanvasElement>byId('source_viewer'),
            addAnimationBtn : byId('add-animation-btn'),
            animListContainer: byId('anim-list-items'),
            baseBoxDialog : {
                container: query('.sizes-dialog-back'),
                widthInput: query(".sizes-dialog-back .input-width"),
                heightInput: query(".sizes-dialog-back .input-height"),
                button: query(".sizes-dialog-back button"),
            },
            frameEditorBlock: {
                container: byId('frame-editor-block'),
                frameAdder: {
                    stage1: query("#frame-editor-block .stage1"),
                    stage2: query("#frame-editor-block .stage2"),
                    container : query('#frame-editor-block .frames-adder'),
                    stickToAxisCheckout: <HTMLInputElement>query('#frame-editor-block .frames-adder input'),
                    selectedNumber: query('#frame-editor-block .frames-adder span.selected')
                }
            },
            animPreviewControls: {
                frameNumInput: query("#animation-preview-column .frame-num-input input"),
                showLast : query("#animation-preview-column button.show-last"),
                showLast2 : query("#animation-preview-column button.show-last2"),
                showLast3 : query("#animation-preview-column button.show-last3"),
                showAll : query("#animation-preview-column button.show-all")
            },
            scaleControlInput: query("#animation-preview-column .scale-control input")
        };
    }

    resetDom(){
        this.html.animListContainer.innerHTML = '';
    }

    setListeners(){

        this.html.addAnimationBtn.onclick = () => {
            if(this.flags.editing)
                return;

            setTimeout(() => {
                let anim = new SpriteAnimation(this, this.flags);
                this.selectedAnimation = anim;
            }, 4);
        }

        this.html.dragMenu.exportSprite.onclick = () => this.exportSprite();        

    }

    registerAnimation(listItem: HTMLElement, anim: SpriteAnimation){
        this.animations.set(anim, listItem);
    }

    removeAnimation(anim){
        anim.selfDestruct();
        this.animations.delete(anim);
        
        for (let key of this.animations.keys()){
            key.selectAsCurrent();
            return;
        }

        AnimationPlayer.stop();
        RTools.drawImage();
    }


    // Sprite will be placed from left to right
    // from top to bottom. Each animation will
    // start with new row.
    exportSprite(){
        // (width / height)
        const minRatio = 0.5;
        const maxRatio = 2;

        let anims = Array.from(this.animations.keys());

        if(!anims.length){
            alert("There is no animations to export.")
            return;
        }

        let maxWidth = this.animationsMaxFrameWidth(anims);
        
        /* Just loop sizes and choose minimum sprite sheet 
         * area starting from ratio 'minRatio' but not 
         * smaller then (maxWidth * 2 + 2) until ratio reach 'maxRatio'.  
         */
        let sizes = this.findOptimalSizes(maxWidth, minRatio, maxRatio);
        
        type SpriteSheetObject = {container: HTMLElement,ctx: CanvasRenderingContext2D };
        let spriteSheet: SpriteSheetObject = this.showNewSpriteSheetCanvas(sizes);
        
        this.drawFramesOnSpriteSheet(sizes, spriteSheet);
    }

    drawFramesOnSpriteSheet(
        sizes: { width: number; height: number; }, 
        sheet: { container: HTMLElement; ctx: CanvasRenderingContext2D; })
    {
        let anims = Array.from(this.animations.keys());
        let {width, height} = sizes;
        // Target sprite position
        let curX = 0;
        let curY = 0;

        anims.forEach( an =>{
            let {frames} = an;
            let fd = frames.frameDeltas;
            let base = frames.baseBox;        
            // Source sprite position
            let shiftX = base.left;
            let shiftY = base.top;

            for(let ind = 0; ind < fd.length; ind++){
                shiftX += fd[ind].xShift;
                shiftY += fd[ind].yShift;

                let newBase = {
                    x: shiftX, 
                    y: shiftY,
                    width: base.width, 
                    height: base.height};
                let targetPos = {x: curX, y: curY};
                RTools.fromFrameImageToSheet(sheet.ctx,newBase,fd[ind].crop, targetPos);


                curX += base.width + 1;
                let lastOne = ind + 1 == fd.length;
                if(curX >= sizes.width || lastOne){
                    curX = 0;
                    curY += base.height + 1;
                }
            }
        });
        
    }

    showNewSpriteSheetCanvas(sizes: { width: number; height: number; }){
        let canvasContainer = this.genNewSpriteSheetContainer(sizes);
        let canvas: HTMLCanvasElement;
        let ctx: RenderingContext;

        document.body.appendChild(canvasContainer);

        canvas = canvasContainer.querySelector("canvas");
        ctx = canvas.getContext("2d");

        /* Close */
        canvasContainer.onmousedown = (e) => {
            if(e.button != 0)
                return;

            canvasContainer.onmousedown = null;
            document.body.removeChild(canvasContainer);
        }

        return {container: canvasContainer, ctx};
    }

    genNewSpriteSheetContainer(sizes: { width: number; height: number; }){
        let {width, height} = sizes;

        let cont = document.createElement("div");
        cont.classList.add("exported-image-container");

        cont.innerHTML = `
            <p>Right mouse click -> save image as.</p>
            <div>
                <canvas width="${width}" height="${height}" class="exported-image"></canvas>
            <div>
        `;

        return cont;
    }

    findOptimalSizes(frameMaxWidth: number, minRatio,maxRatio){
        let smalestArea: number;
        let width = frameMaxWidth * 2 + 2;
        let height = this.getSpriteSheetHeight(width);
        let curWidth = width;
        
        while(true){
            let curHeight = this.getSpriteSheetHeight(curWidth);
            let area = curWidth * curHeight;
            let ratio = curWidth / height;

            if(smalestArea === undefined){
                smalestArea = area;
            }
            else if(smalestArea > area || ratio < minRatio){
                width = curWidth;
                height = curHeight;
                smalestArea = area;
            }

            let step = this.calcSpriteWidthStep(curWidth);
            if(!step)
                break;

            if((curWidth + step)/curHeight > maxRatio)
                break;

            curWidth += step;
        }

        return {width, height};
    }

    
    calcSpriteWidthStep(curWidth: number){
        let anims = Array.from(this.animations.keys());
        let steps: number[] = [];

        anims.forEach(el =>{
            let {frames} = el;
            let box = frames.baseBox;
            let fd = frames.frameDeltas;

            let fited = Math.floor(curWidth / (box.width+1))
            if(fited >= fd.length)
                return;
            
            let step = (fited+1)*(box.width+1) - curWidth;
            if(step)
                steps.push(step);
        });
        
        steps.sort((a,b) => a - b);

        if(steps.length)
            return steps[0];
        else
            return 0;
    }

    getSpriteSheetHeight(width: number){
        let anims = Array.from(this.animations.keys());
        let height = 0;

        anims.forEach( an =>{
            let {frames} = an;
            let box = frames.baseBox;
            let numOfFrames = frames.frameDeltas.length;

            let inRow = Math.floor(width / (box.width+1));
            let rows = Math.floor(numOfFrames / inRow) + numOfFrames % inRow;
            height += rows * (box.height + 1);
        });

        return height;
    }

    animationsMaxFrameWidth(anims: SpriteAnimation[]){
        let maxWidth = 0;

        anims.forEach(el => {
            let {width} =  el.frames.baseBox;
            if(maxWidth < width)
                maxWidth = width;
        });

        return maxWidth;
    }

}