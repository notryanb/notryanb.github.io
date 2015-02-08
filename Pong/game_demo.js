/*
  Make a game of pong, which can be controlled by key presses.
  I would like the paddles to move up and down the sides of the screen.
  I would like the ball to bounce off them.
  The game should keep track of score and display on the page.


  1. Need a canvas to play on.
  2. Need a ball radius
  3. Need two rectangle paddles
  4. Need to update the paddles based on key pressed.
  5. Update Score in html 
  6. When player scores 5 or more, alert a winner and reload.

*/

// Global Variables
var context;
var height = 400;
var width = 600;

var ball_position = [width / 2, height / 2]
var ball_velocity= [1.5,1.5];
var ball_radius = 5;

var paddle_width = 10;
var paddle_height = 80;
var half_paddle_width = paddle_width / 2;
var half_paddle_height = paddle_height / 2;

var paddle1_position = half_paddle_height
var paddle2_position = half_paddle_height
paddle1_velocity = 0
paddle2_velocity = 0

var score1 = 0
var score2 = 0

// init is called as soon as the code is started
function init()
{
  context= myCanvas.getContext('2d'); 
  setInterval(draw,10); //sets the draw interval... kind of like frame rate.

}


function draw()
{
  context.clearRect(0,0, 600,400); // Clears the canvas before every draw,
  context.beginPath(); // Starts the drawing.
  context.fillStyle="#000000";

  // Draws a circle of radius 20 at the coordinates 100,100 on the canvas
  context.arc(ball_position[0],ball_position[1],ball_radius,0,Math.PI*2,true);
  context.closePath();
  context.fill();

  // Draws left paddle
  context.fillStyle = "#000000";
  context.fillRect(0,paddle1_position - half_paddle_height,paddle_width,paddle_height)

  // Draws right paddle
  context.fillStyle = "#000000";
  context.fillRect(590,paddle2_position - half_paddle_height,paddle_width,paddle_height)

  //Draws the lines for boundaries
  context.moveTo(300,0);
  context.lineTo(300,400);
  context.stroke();

  context.moveTo(10,0);
  context.lineTo(10,400);
  context.stroke();

  context.moveTo(590,0);
  context.lineTo(590,400);
  context.stroke();

  // Ball/Field Boundary Logic
  if( ball_position[0] < 0 ) {
    score2 += 1;
    document.getElementById("p2_score").innerHTML = score2
    ball_velocity[0]=-ball_velocity[0]; 
  }

  if ( ball_position[0] > 600 ){
    score1 += 1;
    document.getElementById("p1_score").innerHTML = score1
    ball_velocity[0]=-ball_velocity[0]; 
  }

  if( ball_position[1] < 0 || ball_position[1] > 400) ball_velocity[1]=-ball_velocity[1]; 
    ball_position[0] += ball_velocity[0]; 
    ball_position[1] += ball_velocity[1];



  // Ball and Paddle Collision Logic
  if ( (ball_position[0] <= (ball_radius + paddle_width)) && ((ball_position[1] <= paddle1_position+half_paddle_height) && (ball_position[1] >= paddle1_position - half_paddle_height)) )
    {ball_velocity[0] = -ball_velocity[0];}

  if ( (ball_position[0] >= (width - paddle_width)-ball_radius) && ((ball_position[1] <= (paddle2_position+half_paddle_height)) && (ball_position[1] >= (paddle2_position - half_paddle_height))) )
    {ball_velocity[0] = -ball_velocity[0];}


  // checks for wins, then reloads the game.
  if (score1 >= 5){
    location.reload();
    alert("Player 1 Wins!");
  }

  if (score2 >= 5) {
    location.reload();
    alert("Player 1 Wins!");
  }


}



window.addEventListener('keydown',doKeyDown,true);

function doKeyDown(evt){
  switch (evt.keyCode){
  case 38:
  if (paddle1_position - half_paddle_height > 0){
    paddle1_position -= 15;
  }
  break;

  case 40:
  if ((paddle1_position + half_paddle_height ) < height){
    paddle1_position += 15;
  }
  break;

  case 87:
  if (paddle2_position - half_paddle_height > 0){
    paddle2_position -= 15;
  }
  break;

  case 83:
  if ((paddle2_position + half_paddle_height ) < height){
    paddle2_position += 15;
  }
  break;
  }
}








