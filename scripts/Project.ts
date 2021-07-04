type EditorFlags = {
    editing: boolean,
    baseBoxEditing: boolean,
    baseBoxResizeDraging: boolean,
    baseBoxDraging: boolean,
    framesMassPosotioning: boolean,
    frameEditingMode: boolean
}

type DomWalker = {
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
        frameEditingMode: false
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

    grubDomElements(){
        let query = (str) => document.querySelector(str);
        let byId =  (str) => document.getElementById(str);

        this.html = {
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
}