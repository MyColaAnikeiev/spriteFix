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
            container: HTMLElement;
            stickToAxisCheckout: HTMLInputElement;
            selectedNumber: HTMLElement;
        }
    }
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

        EditingTools.setProject(this, this.html, this.flags);
    }

    grubDomElements(){
        this.html = {
            mainCanvasComtainer: document.getElementById("source_view_container"),
            mainCanvas: <HTMLCanvasElement>document.getElementById('source_viewer'),
            addAnimationBtn : document.getElementById('add-animation-btn'),
            animListContainer: document.getElementById('anim-list-items'),
            baseBoxDialog : {
                container: document.querySelector('.sizes-dialog-back'),
                widthInput: document.querySelector(".sizes-dialog-back .input-width"),
                heightInput: document.querySelector(".sizes-dialog-back .input-height"),
                button: document.querySelector(".sizes-dialog-back button"),
            },
            frameEditorBlock: {
                container: document.getElementById('frame-editor-block'),
                frameAdder: {
                    container : document.querySelector('#frame-editor-block .frames-adder'),
                    stickToAxisCheckout: <HTMLInputElement>document.querySelector('#frame-editor-block .frames-adder input'),
                    selectedNumber: document.querySelector('#frame-editor-block .frames-adder span.selected')
                }
            }
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

        RTools.drawImage();
    }

}