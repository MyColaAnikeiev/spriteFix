type EditorFlags = {
    editing: boolean,
    baseBoxEditing: boolean,
    baseBoxResizeDraging: boolean,
    baseBoxDraging: boolean,
    framesMassPosotioning: boolean
}

type DomWalker = {
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
    animations: Array<SpriteAnimation> = [];

    /* Editing state machine flags */
    flags: EditorFlags = {
        editing: false,
        baseBoxEditing: false,
        baseBoxResizeDraging: false,
        baseBoxDraging: false,
        framesMassPosotioning: false
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
        this.resetListeners();

        EditingTools.setProject(this, this.html, this.flags);
    }

    grubDomElements(){
        this.html = {
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

    resetListeners(){

        this.html.addAnimationBtn.onclick = () => {
            if(this.flags.editing)
                return;

            setTimeout(() => {
            let anim = new SpriteAnimation(this, this.flags);
            this.animations.push(anim);
            }, 1);
        }

    }

    removeAnimation(an){
        an.selfDestruct();

        this.animations = this.animations.filter((el, i, arr)=> {
            if(el != an){
                return true;
            }
            else{ 
                return false;
            }
        });
    }

}