/* All canvas renderings is here */
namespace RTools{

    const background_frame_color : string = "#111";
    const background_color : string = "#444";

    const minCanvasWidth: number = 320;
    const minCanvasHeight : number = 160;
    export const canvasPadding = 10;

    let ctx: CanvasRenderingContext2D; 
    let canvas: HTMLCanvasElement;
    let preview_ctx: CanvasRenderingContext2D;
    let preview_canvas: HTMLCanvasElement;

    let width : number = 0;
    let height : number = 0;
    let spriteImg : HTMLImageElement;

    /* Setters */
    export function setCanvas(el): void{
        canvas = el;
    }
    export function setContext(context): void{
        ctx = context;
    }
    export function setPreviewCanvas(el): void{
        preview_canvas = el;
    }
    export function setPreviewContext(ctx){
        preview_ctx = ctx;
    }
    export function setImg(img : HTMLImageElement): void{
        spriteImg = img;
        width = spriteImg.width;
        height = spriteImg.height;
    }



    export function drawMarkup(
        width: number,
        height: number
    ):void
    {
        if(width < minCanvasWidth || height < minCanvasHeight){
            width = minCanvasWidth;
            height = minCanvasHeight;
        }

        /* Background frame*/
        ctx.fillStyle = background_frame_color;
        ctx.fillRect(0,0,width,height);
        ctx.fillStyle = background_color;
        ctx.fillRect(canvasPadding,canvasPadding,width - canvasPadding*2, height - canvasPadding*2);
    }

    export function drawImage(): void{

        canvas.setAttribute('width', String(width + canvasPadding * 2));
        canvas.setAttribute('height',String(height + canvasPadding * 2));

        ctx.fillStyle = background_frame_color;
        ctx.fillRect(0,0,width + canvasPadding*2 ,height + canvasPadding*2);

        ctx.drawImage(spriteImg,0,0,width,height,
            canvasPadding,canvasPadding,width,height);
    }


    function drawFrameBox(x,y,width,height,color="#a0ffa080"): void{
        x = Math.round(x);
        y = Math.round(y);
        width = Math.round(width);
        height = Math.round(height);

        ctx.beginPath();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        ctx.moveTo(x - 1, y - 1);
        ctx.lineTo(x + width + 1, y - 1);
        ctx.lineTo(x + width + 1, y + height + 1);
        ctx.lineTo(x  - 1, y + height + 1);
        ctx.lineTo(x - 1, y - 1);
        ctx.stroke();
    }

    export function drawFrameBoxes(frames: Frames, selected: number = -1): void{
        drawImage();

        let base = frames.baseBox;
        let deltas = frames.frameDeltas;

        let xShift = base.left + canvasPadding;
        let yShift = base.top  + canvasPadding;

        //selected = selected == -1 ? deltas.length - 1 : selected;

        for(let i = 0; i < deltas.length; i++){
            //let last = deltas.length - 1 == i;

            let d = deltas[i];
            xShift += d.xShift;
            yShift += d.yShift;

            if(d.crop.top || d.crop.right || d.crop.bottom || d.crop.left){
                // Outline
                drawFrameBox(
                    xShift, yShift,
                    base.width, base.height,
                    selected == i ? "#a05ff050" : "#005ff050"
                );
                drawCropedArea(
                    base, 
                    {left: xShift, top: yShift},
                    d.crop,
                    selected == i ? "#a059f050" : "#005ff050"
                );
            }

            drawFrameBox(
                xShift + d.crop.left,
                yShift + d.crop.top,
                base.width - (d.crop.left + d.crop.right),
                base.height - (d.crop.top + d.crop.bottom),
                selected == i ? "#ff1a5090" : "#a0ffa080"
            );
        }

    }

    type BaseBoxT = {top: number,left: number,width: number,height: number};
    type CropT = {top: number, right: number, bottom: number, left: number};

    function drawCropedArea(
        base: BaseBoxT, 
        pos: { left: number; top: number; }, 
        crop: CropT, 
        color = "#005ff050")
    {
        ctx.fillStyle = color;
        ctx.fillRect(
            pos.left, 
            pos.top, 
            base.width, crop.top);
        ctx.fillRect(
            pos.left, 
            pos.top + base.height - crop.bottom, 
            base.width, crop.bottom);
        ctx.fillRect(
            pos.left, 
            pos.top + crop.top, 
            crop.left, 
            base.height - crop.top - crop.bottom );
        ctx.fillRect(
            pos.left + base.width - crop.right, 
            pos.top + crop.top, 
            crop.right, 
            base.height - crop.top - crop.bottom );
    }

    /* Show frame by index in preview canvas. */
    /* Base box image sample will be resized to fit in preview canvas as a whole.*/
    export function showFrame(frames: Frames, ind: number){
        let pWidth = preview_canvas.width;
        let pHeight = preview_canvas.height;
        let pRatio = pWidth / pHeight;

        let {crop} = frames.frameDeltas[ind];
        let fWidth = frames.baseBox.width
        let fHeight = frames.baseBox.height;
        // Apply crop
        let cWidth  = fWidth -  (crop.left + crop.right);
        let cHeight = fHeight - (crop.top  + crop.bottom);
        let fRatio = fWidth / fHeight;

        /* Fill background */
        preview_ctx.fillStyle = background_color;
        preview_ctx.fillRect(0,0,pWidth,pHeight);

        let position = getFrameAbsolutePosition(frames, ind);
        let bb = frames.baseBox;
        if(pRatio > fRatio){
            let wRatio = fRatio / pRatio;
            let scale = pHeight / fHeight;

            let gap = (1 - wRatio) / 2 * pWidth;

            preview_ctx.drawImage(spriteImg,
                position.left + crop.left,
                position.top  + crop.top,
                cWidth, cHeight,
                gap + crop.left*scale, 
                crop.top*scale,
                pWidth*wRatio - (crop.left+crop.right)*scale,
                pHeight - (crop.top+crop.bottom)*scale
                );
        }
        else{
            let hRatio = pRatio / fRatio;
            let gap = (1 - hRatio) / 2 * pHeight;
            let scale = pWidth / fWidth;

            preview_ctx.drawImage(spriteImg,
                position.left + crop.left, 
                position.top  + crop.top, 
                cWidth, cHeight,
                crop.left*scale, 
                gap + crop.top*scale, 
                pWidth - (crop.left+crop.right)*scale, 
                pHeight*hRatio - (crop.top+crop.bottom)*scale
                );
        }
        
    }
    
    function getFrameAbsolutePosition(frames: Frames, ind: number){
        let x = frames.baseBox.left;
        let y = frames.baseBox.top;

        for(let i = 0; i <= ind; i++){
            x += frames.frameDeltas[i].xShift;
            y += frames.frameDeltas[i].yShift;
        }

        return { left: x, top: y }
    }

    export function fromFrameImageToSheet(
        ctx: CanvasRenderingContext2D,
        base: { x: number; y: number; width: number; height: number; },
        crop: { top: number; right: number; bottom: number; left: number; }, 
        targetPos: { x: number; y: number; })
    {
        ctx.drawImage(spriteImg,
            base.x + crop.left,
            base.y + crop.top,
            base.width - crop.left - crop.right,
            base.height -crop.top - crop.bottom,
            targetPos.x + crop.left,
            targetPos.y + crop.top,
            base.width - crop.left - crop.right,
            base.height -crop.top - crop.bottom
        );
    }
} 