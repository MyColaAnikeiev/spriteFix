/* Project object */
let curProject: Project | null = null;

let canvas_container: HTMLElement = document.getElementById("source_view_container");
let source_canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("source_viewer");
let ctx : CanvasRenderingContext2D = (<any>source_canvas).getContext("2d");

let preview_canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('preview-canvas');
let preview_context : CanvasRenderingContext2D = preview_canvas.getContext('2d');

let canvas_width : number = canvas_container.clientWidth - 2; // 2 padding
let canvas_height: number = 360;

source_canvas.setAttribute("width",String(canvas_width));
source_canvas.setAttribute("height",String(canvas_height));

RTools.setCanvas(source_canvas);
RTools.setContext(ctx);
RTools.setPreviewCanvas(preview_canvas);
RTools.setPreviewContext(preview_context);
RTools.drawMarkup(canvas_width,canvas_height);


/* Image loading */
function clickOpen() : void{
    let fileInput: HTMLInputElement;

    /* Block while editing */
    if(curProject && curProject.flags.editing)
        return;

    function readFile(e){
        let file = e.target.files[0];
        if(!file)
            return;
        
        let im = document.createElement('img');
        let urlImg = im.src = URL.createObjectURL(file);
        im.src = urlImg;
        im.onload = () => {
            curProject = new Project(im);
        }
        document.body.removeChild(fileInput);
    }

    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    fileInput.onchange = readFile;
    document.body.appendChild(fileInput);

    let mouseEvent = document.createEvent('MouseEvent');
    mouseEvent.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    fileInput.dispatchEvent(mouseEvent);
}


let openButton = document.getElementById('open-button');
openButton.onclick=clickOpen;
