type EditorFlags = {
    editing: boolean,
    baseBoxEditing: boolean,
    baseBoxDraging: boolean,
    framesMassPosotioning: boolean
}

/* New project is started when user opens Sprite */
class Project{
    animations: Array<SpriteAnimation> = [];

    /* Editing state machine flags */
    flags: EditorFlags = {
        editing: false,
        baseBoxEditing: false,
        baseBoxDraging: false,
        framesMassPosotioning: false
    }

    html:{
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
            let anim = new SpriteAnimation(this, this.html.animListContainer, this.flags);
            this.animations.push(anim);
            }, 1);
        }

    }

    removeAnimation(an){
        this.animations = this.animations.filter((el, i, arr)=> {
            if(el != an)
                return true;
            else 
                return false;
        });
    }

}